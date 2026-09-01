import type { SupabaseClient } from "@supabase/supabase-js";
import { isGscConfigured, pagePerformance, queryPerformance, type GscRow } from "@/lib/search-console";
import { SITE_URL } from "@/lib/site-url";

export type DigestSection = { title: string; lines: string[] };

// Buckets a GSC page URL into the same route-pattern groups the spec asks
// to review impressions "by URL pattern" — coach profiles, plain discipline
// pages, discipline+area pages, riding-instructors area pages, everything
// else.
function urlPattern(url: string): string {
  const path = url.replace(SITE_URL, "");
  if (/^\/coaches\//.test(path)) return "/coaches/[slug]";
  if (/^\/disciplines\/[^/]+\/[^/]+/.test(path)) return "/disciplines/[slug]/[area]";
  if (/^\/disciplines\//.test(path)) return "/disciplines/[slug]";
  if (/^\/riding-instructors\//.test(path)) return "/riding-instructors/[area]";
  return path || "/";
}

// Zero-result search_events split into supply gaps (a real discipline was
// picked but nothing matched — a recruiting target) vs vocabulary gaps (no
// discipline resolved at all — the rider's words didn't map to anything we
// know, feeds the alias pipeline). Works today, no GSC dependency — this is
// the site's own search data, not Google's.
async function zeroResultSplit(supabase: SupabaseClient): Promise<DigestSection> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("search_events")
    .select("term_ids, location_text")
    .eq("result_count", 0)
    .gte("created_at", since);

  const rows = data ?? [];
  const supplyGaps = rows.filter((r) => (r.term_ids ?? []).length > 0);
  const vocabGaps = rows.filter((r) => (r.term_ids ?? []).length === 0);

  const byLocation = new Map<string, number>();
  for (const r of supplyGaps) {
    const key = r.location_text ?? "(no location)";
    byLocation.set(key, (byLocation.get(key) ?? 0) + 1);
  }
  const topSupplyGaps = [...byLocation.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    title: "Zero-result searches, last 7 days",
    lines: [
      `${supplyGaps.length} supply gap${supplyGaps.length === 1 ? "" : "s"} (a discipline was picked, nothing matched — recruiting targets)`,
      ...topSupplyGaps.map(([loc, n]) => `  - ${loc}: ${n}`),
      `${vocabGaps.length} vocabulary gap${vocabGaps.length === 1 ? "" : "s"} (no discipline resolved — feed the alias pipeline)`,
    ],
  };
}

// Everything past this point needs GSC (spec: unmapped queries, near
// misses, performance by URL pattern, 90-day prune candidates) — all
// return an explanatory single-line section instead of silently vanishing
// when the service account isn't wired up yet (CLAUDE.md: "Verify the
// Search Console domain property on launch day").
const GSC_NOT_CONNECTED: DigestSection = {
  title: "Google Search Console",
  lines: [
    "Not connected yet — set GOOGLE_SERVICE_ACCOUNT_KEY and GSC_SITE_URL, verify the domain property, and add the service account as a user on it. See CLAUDE.md, \"Search & taxonomy build spec\".",
  ],
};

async function unmappedQueries(supabase: SupabaseClient, rows: GscRow[]): Promise<DigestSection> {
  const { data: aliasRows } = await supabase.from("term_aliases").select("alias");
  const { data: termRows } = await supabase.from("terms").select("name");
  const known = [
    ...(aliasRows ?? []).map((a) => a.alias.toLowerCase()),
    ...(termRows ?? []).map((t) => t.name.toLowerCase()),
  ];

  const unmapped = rows
    .filter((r) => {
      const q = r.keys[0]?.toLowerCase() ?? "";
      return !known.some((k) => q.includes(k));
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  return {
    title: "Unmapped queries (impressions, no matching term or alias)",
    lines:
      unmapped.length > 0
        ? unmapped.map((r) => `  - "${r.keys[0]}" — ${r.impressions} impressions, ${r.clicks} clicks`)
        : ["None this week."],
  };
}

function nearMisses(rows: GscRow[]): DigestSection {
  const misses = rows
    .filter((r) => r.position >= 5 && r.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
  return {
    title: "Near misses (position 5-20, by impressions)",
    lines:
      misses.length > 0
        ? misses.map((r) => `  - "${r.keys[0]}" — position ${r.position.toFixed(1)}, ${r.impressions} impressions`)
        : ["None this week."],
  };
}

function performanceByPattern(rows: GscRow[]): DigestSection {
  const byPattern = new Map<string, { clicks: number; impressions: number }>();
  for (const r of rows) {
    const pattern = urlPattern(r.keys[0]);
    const cur = byPattern.get(pattern) ?? { clicks: 0, impressions: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    byPattern.set(pattern, cur);
  }
  return {
    title: "Performance by URL pattern",
    lines: [...byPattern.entries()]
      .sort((a, b) => b[1].impressions - a[1].impressions)
      .map(([pattern, { clicks, impressions }]) => `  - ${pattern}: ${impressions} impressions, ${clicks} clicks`),
  };
}

// 90-day prune candidates: pages the indexable_pages register currently
// serves that got zero GSC impressions across the queried window. Spec:
// "prune or merge any page with zero impressions after 90 days."
async function pruneCandidates(supabase: SupabaseClient, rows: GscRow[]): Promise<DigestSection> {
  const seenUrls = new Set(rows.map((r) => urlPattern(r.keys[0]) + "|" + r.keys[0].replace(SITE_URL, "")));
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pages } = await supabase
    .from("indexable_pages")
    .select("slug, computed_at")
    .eq("eligible", true)
    .lt("computed_at", ninetyDaysAgo);

  const candidates = (pages ?? []).filter((p) => !seenUrls.has(`/${p.slug}|/${p.slug}`));

  return {
    title: "Prune candidates (eligible 90+ days, zero GSC impressions)",
    lines: candidates.length > 0 ? candidates.map((p) => `  - /${p.slug}`) : ["None — either too new to judge, or all earning impressions."],
  };
}

// Promotion candidates: a skill/attribute alias appearing in the same GSC
// query as a known area name — the spec's example is a location-qualified
// skill search ("float loading Geelong") crossing the bar to deserve its
// own page (flip generates_pages = true on that term).
async function promotionCandidates(supabase: SupabaseClient, rows: GscRow[]): Promise<DigestSection> {
  const { data: skillAliases } = await supabase
    .from("term_aliases")
    .select("alias, terms!inner(name, kind)")
    .in("terms.kind", ["skill", "attribute"]);
  const { data: areas } = await supabase.from("areas").select("name").eq("active", true);

  const skillTerms = (skillAliases ?? []) as unknown as { alias: string; terms: { name: string } }[];
  const areaNames = (areas ?? []).map((a) => a.name.toLowerCase());

  const candidates = rows.filter((r) => {
    const q = r.keys[0]?.toLowerCase() ?? "";
    const matchesSkill = skillTerms.some((s) => q.includes(s.alias.toLowerCase()));
    const matchesArea = areaNames.some((a) => q.includes(a));
    return matchesSkill && matchesArea;
  });

  return {
    title: "Promotion candidates (skill/attribute + location searched together)",
    lines:
      candidates.length > 0
        ? candidates.map((r) => `  - "${r.keys[0]}" — ${r.impressions} impressions`)
        : ["None this week."],
  };
}

export async function buildSeoDigest(supabase: SupabaseClient): Promise<DigestSection[]> {
  const sections: DigestSection[] = [await zeroResultSplit(supabase)];

  if (!isGscConfigured) {
    sections.push(GSC_NOT_CONNECTED);
    return sections;
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [queryRows, pageRows] = await Promise.all([
    queryPerformance(startDate, endDate),
    pagePerformance(startDate, endDate),
  ]);

  sections.push(
    await unmappedQueries(supabase, queryRows),
    nearMisses(queryRows),
    performanceByPattern(pageRows),
    await pruneCandidates(supabase, pageRows),
    await promotionCandidates(supabase, queryRows)
  );

  return sections;
}

export function renderDigestText(sections: DigestSection[]): string {
  return sections.map((s) => `${s.title}\n${s.lines.map((l) => l).join("\n")}`).join("\n\n");
}

export function renderDigestHtml(sections: DigestSection[]): string {
  return sections
    .map(
      (s) =>
        `<h2 style="font-size:16px;margin:24px 0 8px">${s.title}</h2><pre style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin:0">${s.lines
          .map((l) => l.replace(/</g, "&lt;"))
          .join("\n")}</pre>`
    )
    .join("\n");
}
