import type { MetadataRoute } from "next";
import { disciplines } from "@/lib/disciplines";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/for-coaches`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const disciplineRoutes: MetadataRoute.Sitemap = disciplines.map((d) => ({
    url: `${siteUrl}/disciplines/${d.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Real published coaches only — mock data (src/lib/mock-coaches.ts) and
  // the static placeholder fallback are dev/QA aids, not real listings,
  // and shouldn't be indexed.
  let coachRoutes: MetadataRoute.Sitemap = [];
  let areaRoutes: MetadataRoute.Sitemap = [];
  const supabase = await createClient();
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
