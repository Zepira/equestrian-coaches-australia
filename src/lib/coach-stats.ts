import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads for the provider dashboard: the four monthly numbers with deltas
 * (per profession for someone in two sections), the twelve-month view
 * trend, completeness from the profession row, and the profession's
 * benchmark. Runs as the provider (RLS: own rows only).
 */
export type MonthStats = {
  month: string; // "August 2026"
  impressions: number;
  views: number;
  reveals: number;
  enquiries: number;
  delta: { impressions: number; views: number; reveals: number; enquiries: number };
};

const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

async function countBetween(
  supabase: SupabaseClient,
  table: "provider_events" | "enquiries",
  coachId: string,
  from: Date,
  to: Date,
  kind?: string,
  professionId?: string | null
) {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("provider_id", coachId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  if (kind) q = q.eq("kind", kind);
  if (professionId) q = q.eq("profession_id", professionId);
  const { count } = await q;
  return count ?? 0;
}

/** This month's numbers and the change on last month; one section's only when `professionId` is given. */
export async function monthStats(supabase: SupabaseClient, coachId: string, now = new Date(), professionId?: string | null): Promise<MonthStats> {
  const thisStart = startOfMonth(now);
  const nextStart = addMonths(thisStart, 1);
  const prevStart = addMonths(thisStart, -1);
  const [impressions, views, reveals, enquiries, pImp, pViews, pRev, pEnq] = await Promise.all([
    countBetween(supabase, "provider_events", coachId, thisStart, nextStart, "impression", professionId),
    countBetween(supabase, "provider_events", coachId, thisStart, nextStart, "view", professionId),
    countBetween(supabase, "provider_events", coachId, thisStart, nextStart, "reveal", professionId),
    countBetween(supabase, "enquiries", coachId, thisStart, nextStart, undefined, professionId),
    countBetween(supabase, "provider_events", coachId, prevStart, thisStart, "impression", professionId),
    countBetween(supabase, "provider_events", coachId, prevStart, thisStart, "view", professionId),
    countBetween(supabase, "provider_events", coachId, prevStart, thisStart, "reveal", professionId),
    countBetween(supabase, "enquiries", coachId, prevStart, thisStart, undefined, professionId),
  ]);
  return {
    month: thisStart.toLocaleString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }),
    impressions,
    views,
    reveals,
    enquiries,
    delta: {
      impressions: impressions - pImp,
      views: views - pViews,
      reveals: reveals - pRev,
      enquiries: enquiries - pEnq,
    },
  };
}

/** Twelve monthly view counts, oldest first, ending with the current month. */
export async function twelveMonthViews(supabase: SupabaseClient, coachId: string, now = new Date()) {
  const thisStart = startOfMonth(now);
  const from = addMonths(thisStart, -11);
  const { data } = await supabase
    .from("provider_events")
    .select("created_at")
    .eq("provider_id", coachId)
    .eq("kind", "view")
    .gte("created_at", from.toISOString());
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = addMonths(from, i);
    return { month: d.toLocaleString("en-AU", { month: "short", timeZone: "UTC" }).charAt(0), key: d.toISOString().slice(0, 7), views: 0 };
  });
  for (const row of data ?? []) {
    const key = String(row.created_at).slice(0, 7);
    const b = buckets.find((x) => x.key === key);
    if (b) b.views++;
  }
  return buckets;
}

export type CompletenessRow = { key: string; label: string; done: boolean; href: string; weight: number };

const DEFAULT_ITEMS = [
  { key: "photo", label: "Photo uploaded", weight: 1 },
  { key: "bio", label: "Bio written", weight: 1 },
  { key: "terms", label: "Disciplines tagged", weight: 1 },
  { key: "location", label: "Location set", weight: 1 },
  { key: "testimonials", label: "Three testimonials", weight: 1 },
  { key: "video", label: "Intro video", weight: 1 },
];

const HREF: Record<string, string> = {
  photo: "/dashboard/profile#photo",
  bio: "/dashboard/profile#bio",
  terms: "/dashboard/profile#disciplines",
  location: "/dashboard/profile#location",
  testimonials: "/dashboard/profile#testimonials",
  video: "/dashboard/profile#video",
};

/**
 * The score out of 100 (§08.3): items, labels and weights from the
 * profession row, so a coach is asked for a photo of them coaching and a
 * farrier for one at work. An item the plan can't do (video) is left out
 * rather than counted against them. `next` is the "one thing to do this
 * month": the heaviest item not done.
 */
export function profileCompleteness(
  input: { hasPhoto: boolean; bio: string; termCount: number; hasLocation: boolean; testimonialCount: number; hasVideo: boolean; videoAllowed: boolean },
  items: { key: string; label: string; weight: number }[] | undefined
): { pct: number; items: CompletenessRow[]; next: CompletenessRow | null } {
  // A profession row with no items (or one cached before the field existed) gets the standard six.
  if (!items?.length) items = DEFAULT_ITEMS;
  const done: Record<string, boolean> = {
    photo: input.hasPhoto,
    bio: input.bio.trim().length >= 80,
    terms: input.termCount > 0,
    location: input.hasLocation,
    testimonials: input.testimonialCount >= 3,
    video: input.hasVideo,
  };
  const rows = items
    .filter((i) => i.key !== "video" || input.videoAllowed)
    .map((i) => ({ key: i.key, label: i.label, weight: i.weight, done: Boolean(done[i.key]), href: HREF[i.key] ?? "/dashboard/profile" }));
  const total = rows.reduce((n, r) => n + r.weight, 0) || 1;
  const got = rows.filter((r) => r.done).reduce((n, r) => n + r.weight, 0);
  const next = [...rows].filter((r) => !r.done).sort((a, b) => b.weight - a.weight)[0] ?? null;
  return { pct: Math.round((got / total) * 100), items: rows, next };
}

/** Last full month's median for the profession, or null when too few providers to say. */
export async function professionBenchmark(supabase: SupabaseClient, professionId: string, now: Date, minProviders: number) {
  const last = addMonths(startOfMonth(now), -1).toISOString().slice(0, 10);
  const { data } = await supabase.rpc("profession_benchmark", { p_profession_id: professionId, p_month: last, p_min: minProviders });
  const row = (data as { providers: number; median_views: number; median_enquiries: number }[] | null)?.[0];
  return row ? { providers: row.providers, views: Math.round(Number(row.median_views)), enquiries: Math.round(Number(row.median_enquiries)), month: last } : null;
}
