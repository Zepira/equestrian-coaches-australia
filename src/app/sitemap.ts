import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDisciplineContent } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { areaPagePath, disciplinePath, profilePath, sectionPath } from "@/lib/page-paths";
import { SITE_URL as siteUrl } from "@/lib/site-url";
import { isLegalApproved } from "@/lib/settings";
import { isGatedHost, showsComingSoon } from "@/lib/launch";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Before launch the home page is the only page there is, and a test host has
  // no business advertising anything at all. Reading the host makes this a
  // dynamic route, which is what lets one deployment answer differently per
  // host (src/lib/launch.ts).
  const host = (await headers()).get("host");
  if (isGatedHost(host) || showsComingSoon(host)) {
    return [{ url: siteUrl, changeFrequency: "daily", priority: 1 }];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/for-coaches`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/horse-care`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/list-your-business`, changeFrequency: "monthly", priority: 0.5 },
    // The terms and privacy policy, once the solicitor has signed them off.
    ...((await isLegalApproved())
      ? (["/terms", "/privacy"] as const).map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "yearly" as const, priority: 0.2 }))
      : []),
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

  // Published guides (M9), with the real date they last changed.
  const db = await createClient();
  const { data: guides } = db ? await db.from("guides").select("slug, updated_at").eq("status", "published") : { data: [] };
  const guideRoutes: MetadataRoute.Sitemap = [
    ...((guides ?? []).length ? [{ url: `${siteUrl}/guides`, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...(guides ?? []).map((g) => ({ url: `${siteUrl}/guides/${g.slug}`, lastModified: new Date(g.updated_at as string), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];

  return [...staticRoutes, ...disciplineRoutes, ...coachRoutes, ...areaRoutes, ...guideRoutes];
}
