import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDisciplineContent } from "@/lib/supabase/queries";
import { horseCare, sectionHref } from "@/lib/professions";
import { areaPagePath, providerPath } from "@/lib/page-paths";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/coaches`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/for-coaches`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/disciplines`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/horse-care`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/list-your-business`, changeFrequency: "monthly", priority: 0.5 },
    // Each open horse care profession's section (/farriers…). Professional
    // profiles are mock data for now, so like mock coaches they stay out.
    ...horseCare
      .filter((p) => p.open)
      .map((p) => ({ url: `${siteUrl}${sectionHref(p)}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];

  const supabase = await createClient();
  // Active disciplines only, straight from the terms table — a deactivated
  // discipline leaves the sitemap the moment an admin switches it off.
  const disciplineRoutes: MetadataRoute.Sitemap = (await getDisciplineContent(supabase)).map((d) => ({
    url: `${siteUrl}/disciplines/${d.slug}`,
    lastModified: d.updated_at ? new Date(d.updated_at) : undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Real published coaches only — mock data (src/lib/mock-coaches.ts) and
  // the static placeholder fallback are dev/QA aids, not real listings,
  // and shouldn't be indexed.
  let coachRoutes: MetadataRoute.Sitemap = [];
  let areaRoutes: MetadataRoute.Sitemap = [];
  if (supabase) {
    // Published providers, at the address their primary profession gives
    // them (src/lib/page-paths.ts).
    const { data } = await supabase
      .from("providers")
      .select("slug, updated_at, provider_terms(sort_order, terms(slug, kind))")
      .eq("status", "published");
    coachRoutes = (data ?? []).map((p) => {
      const primary = ((p as unknown as { provider_terms: { sort_order: number; terms: { slug: string; kind: string } | null }[] }).provider_terms ?? [])
        .filter((t) => t.terms?.kind === "profession")
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.terms?.slug;
      return {
        url: `${siteUrl}${providerPath(p.slug, primary)}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

    // Only pages the nightly recompute has cleared the gate for, never every
    // area: that's the doorway-page mistake the spec warns against. Rows
    // with no route yet (horse care, before stage 3) are left out.
    const { data: pages } = await supabase
      .from("indexable_pages")
      .select("last_change, profession:terms!indexable_pages_profession_id_fkey(slug), term:terms!indexable_pages_term_id_fkey(slug), areas(slug)")
      .eq("eligible", true);
    areaRoutes = (pages ?? []).flatMap((p) => {
      const row = p as unknown as { last_change: string | null; profession: { slug: string } | null; term: { slug: string } | null; areas: { slug: string } | null };
      if (!row.profession || !row.areas) return [];
      const path = areaPagePath({ professionSlug: row.profession.slug, termSlug: row.term?.slug, areaSlug: row.areas.slug });
      return path
        ? [{ url: `${siteUrl}${path}`, lastModified: row.last_change ? new Date(row.last_change) : undefined, changeFrequency: "weekly" as const, priority: 0.75 }]
        : [];
    });
  }

  return [...staticRoutes, ...disciplineRoutes, ...coachRoutes, ...areaRoutes];
}
