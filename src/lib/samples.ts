import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { showSampleListings } from "@/lib/settings";
import { mockProfessionalCount } from "@/lib/mock-professionals";

/**
 * Sample listings (the mock coaches and professionals in mock-coaches.ts
 * and mock-professionals.ts) fill the site before real people join. They
 * go (The Site as a CMS §12):
 *
 *  - for a profession, as soon as it has one real published provider, so a
 *    rider never sees a made-up farrier beside a real one;
 *  - everywhere, when the show_sample_listings setting is switched off in
 *    admin, which is the launch-day step.
 *
 * Every page that merges samples asks here first. The real counts are
 * cached for five minutes under LISTINGS_TAG, which a publish, a hide or a
 * lapsed plan clears (provider-lifecycle.ts).
 */
export const LISTINGS_TAG = "listings";

const loadRealCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createPublicSupabase();
    if (!supabase) return {};
    const { data } = await supabase
      .from("provider_terms")
      .select("provider_id, terms!inner(slug, kind), providers!inner(status)")
      .eq("terms.kind", "profession")
      .eq("providers.status", "published");
    const counts: Record<string, number> = {};
    for (const r of (data ?? []) as unknown as { terms: { slug: string } }[]) counts[r.terms.slug] = (counts[r.terms.slug] ?? 0) + 1;
    return counts;
  },
  ["real-provider-counts"],
  { tags: [LISTINGS_TAG], revalidate: 300 }
);

export type Samples = {
  /** The admin switch. */
  enabled: boolean;
  /** Published providers per profession slug. */
  realCounts: Record<string, number>;
  /** Whether this profession still shows sample listings. */
  show: (professionSlug: string) => boolean;
};

export async function getSamples(): Promise<Samples> {
  const [enabled, realCounts] = await Promise.all([showSampleListings(), loadRealCounts()]);
  return { enabled, realCounts, show: (slug) => enabled && !((realCounts[slug] ?? 0) > 0) };
}

/** Horse care professionals listed in a profession (or all of them): the real ones, plus samples where the profession still shows them. */
export function professionalCount(samples: Samples, professionSlugs: string[]): number {
  return professionSlugs.reduce((n, slug) => n + (samples.realCounts[slug] ?? 0) + (samples.show(slug) ? mockProfessionalCount(slug) : 0), 0);
}
