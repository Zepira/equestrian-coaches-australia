import { notFound, permanentRedirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { CMS_TAG, getProfession } from "@/lib/cms/read";
import { getMockCoachBySlug } from "@/lib/mock-coaches";
import { getCoachBySlug } from "@/lib/placeholder-coaches";
import { profilePath, termPath } from "@/lib/page-paths";
import type { Profession } from "@/lib/professions";

/**
 * The lookups behind the one profession template (src/app/[profession]/…):
 * which profession a URL names, its terms, a place, and whether a place page
 * has earned its address. Reads are cookie-free so the section pages can be
 * cached; nothing here decides what a page looks like.
 */

/** The profession a top-level segment names, if it has a public section; otherwise a 404. */
export async function requireSection(slug: string): Promise<Profession> {
  const profession = await getProfession(slug);
  if (!profession || !profession.open) notFound();
  return profession;
}

export type SectionTerm = { id: string; slug: string; name: string };

/** A profession's active disciplines or specialities, A to Z. */
export const getSectionTerms = unstable_cache(
  async (professionId: string | null): Promise<SectionTerm[]> => {
    const supabase = createPublicSupabase();
    if (!supabase || !professionId) return [];
    const { data } = await supabase
      .from("terms")
      .select("id, slug, name")
      .eq("kind", "discipline")
      .eq("parent_id", professionId)
      .eq("active", true)
      .order("name");
    return (data ?? []) as SectionTerm[];
  },
  ["section-terms"],
  { tags: [CMS_TAG], revalidate: 60 }
);

/**
 * /[profession]/<word> didn't match a term. Before giving up, in this order
 * (CLAUDE.md, "Redirect ordering trap"):
 *
 *  1. Under /coaches, the word may be a provider: /coaches/[slug] was every
 *     coach's profile until stage 3. Provider slugs are checked first, so a
 *     coach can never be shadowed by a discipline added later.
 *  2. A term whose slug was changed in admin: term_slug_history maps the old
 *     slug to the term, whose current slug is where it lives now (one hop,
 *     however many renames).
 *
 * `rest` carries the remainder of the path (e.g. "/in/geelong").
 */
export async function redirectMissingTerm(profession: Profession, word: string, rest = ""): Promise<never> {
  const supabase = createPublicSupabase();
  if (profession.slug === "coaches" && !rest) {
    const { data: provider } = supabase
      ? await supabase.from("providers").select("slug").eq("slug", word).eq("status", "published").maybeSingle()
      : { data: null };
    if (provider || getMockCoachBySlug(word) || getCoachBySlug(word)) permanentRedirect(profilePath(word));
  }
  if (supabase && profession.id) {
    const { data: history } = await supabase
      .from("term_slug_history")
      .select("terms(slug)")
      .eq("kind", "discipline")
      .eq("parent_id", profession.id)
      .eq("old_slug", word)
      .maybeSingle();
    const current = (history as unknown as { terms: { slug: string } | null } | null)?.terms?.slug;
    if (current && current !== word) permanentRedirect(termPath(profession.slug, current) + rest);
  }
  notFound();
}

export type Area = { id: string; slug: string; name: string; state: string; lat: number; long: number; default_radius_km: number };

export async function getArea(slug: string): Promise<Area | null> {
  const supabase = createPublicSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("areas")
    .select("id, slug, name, state, lat, long, default_radius_km")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Area | null) ?? null;
}

/**
 * Whether a place page has earned its address: indexable_pages says enough
 * providers of this profession (and term) are there. Below the gate the
 * page redirects to its parent rather than render something thin.
 */
export async function isAreaPageEligible(professionId: string | null, areaId: string, termId: string | null): Promise<boolean> {
  const supabase = createPublicSupabase();
  if (!supabase || !professionId) return false;
  let query = supabase.from("indexable_pages").select("eligible").eq("profession_id", professionId).eq("area_id", areaId);
  query = termId ? query.eq("term_id", termId) : query.is("term_id", null);
  const { data } = await query.maybeSingle();
  return Boolean(data?.eligible);
}
