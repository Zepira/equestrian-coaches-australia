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
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.from("coach_profiles").select("slug").eq("published", true);
    coachRoutes = (data ?? []).map((c) => ({
      url: `${siteUrl}/coaches/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  }

  return [...staticRoutes, ...disciplineRoutes, ...coachRoutes];
}
