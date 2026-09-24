import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDisciplineContent } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { areaPagePath, disciplinePath, profilePath, sectionPath } from "@/lib/page-paths";
import { SITE_URL as siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/for-coaches`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/horse-care`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/list-your-business`, changeFrequency: "monthly", priority: 0.5 },
    // Every open profession's section (/coaches, /farriers…). Horse care
    // specialities (/farriers/[term]) stay out while every listing on them
    // is mock data; coaching's disciplines are below. Professional profiles
    // are mock data too, so like mock coaches they stay out.
    ...(await getProfessions())
      .filter((p) => p.open)
      .map((p) => ({ url: `${siteUrl}${sectionPath(p.slug)}`, changeFrequency: "daily" as const, priority: 0.9 })),
  ];

  const supabase = await createClient();
  // Active disciplines only, straight from the terms table — a deactivated
  // discipline leaves the sitemap the moment an admin switches it off.
  const disciplineRoutes: MetadataRoute.Sitemap = (await getDisciplineContent(supabase)).map((d) => ({
    url: `${siteUrl}${disciplinePath(d.slug)}`,
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
    // Published providers, every profession at /profile/[slug].
    const { data } = await supabase.from("providers").select("slug, updated_at").eq("status", "published");
    coachRoutes = (data ?? []).map((p) => {
      return {
        url: `${siteUrl}${profilePath(p.slug)}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

    // Only pages the nightly recompute has cleared the gate for, never every
    // area: that's the doorway-page mistake the spec warns against.
    const { data: pages } = await supabase
      .from("indexable_pages")
      .select("last_change, profession:terms!indexable_pages_profession_id_fkey(slug), term:terms!indexable_pages_term_id_fkey(slug), areas(slug)")
      .eq("eligible", true);
    areaRoutes = (pages ?? []).flatMap((p) => {
      const row = p as unknown as { last_change: string | null; profession: { slug: string } | null; term: { slug: string } | null; areas: { slug: string } | null };
      if (!row.profession || !row.areas) return [];
      const path = areaPagePath({ professionSlug: row.profession.slug, termSlug: row.term?.slug, areaSlug: row.areas.slug });
      return [{ url: `${siteUrl}${path}`, lastModified: row.last_change ? new Date(row.last_change) : undefined, changeFrequency: "weekly" as const, priority: 0.75 }];
    });
  }

  return [...staticRoutes, ...disciplineRoutes, ...coachRoutes, ...areaRoutes];
}
