import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDisciplineContent } from "@/lib/supabase/queries";
import { horseCare, sectionHref } from "@/lib/professions";

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
    const { data } = await supabase.from("coach_profiles").select("slug").eq("published", true);
    coachRoutes = (data ?? []).map((c) => ({
      url: `${siteUrl}/coaches/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Only pages the nightly indexable_pages recompute has cleared the
    // 3-coach gate for (0012_indexable_pages.sql) — never every area, that's
    // the doorway-page mistake the spec explicitly warns against.
    const { data: pages } = await supabase
      .from("indexable_pages")
      .select("slug, last_coach_change")
      .eq("eligible", true);
    areaRoutes = (pages ?? []).map((p) => ({
      url: `${siteUrl}/${p.slug}`,
      lastModified: p.last_coach_change ? new Date(p.last_coach_change) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  }

  return [...staticRoutes, ...disciplineRoutes, ...coachRoutes, ...areaRoutes];
}
