/**
 * Every public address the database knows about but doesn't store (The Site
 * as a CMS §04: "no URLs stored", §05.3 for the shapes). One template for
 * every profession, coaches included:
 *
 *   /[profession]                       the section (/coaches, /farriers)
 *   /[profession]/[term]                a discipline or speciality
 *   /[profession]/in/[area]             everyone in that profession near a place
 *   /[profession]/[term]/in/[area]      both
 *   /profile/[slug]                     every provider, whatever they do
 *   /events/[id]                        every event
 *
 * The `in` segment is load-bearing: without it /coaches/dressage and
 * /coaches/geelong have the same shape and the router would have to guess.
 * That is also why no speciality may be called "in" (RESERVED_TERM_SLUGS).
 *
 * Nothing else in the app should build these strings by hand.
 */
export function sectionPath(professionSlug: string): string {
  return `/${professionSlug}`;
}

export function termPath(professionSlug: string, termSlug: string): string {
  return `/${professionSlug}/${termSlug}`;
}

/** A discipline page under coaching, the common case. */
export function disciplinePath(disciplineSlug: string): string {
  return termPath("coaches", disciplineSlug);
}

/** An indexable_pages row (profession, optional term, area) as an address. */
export function areaPagePath(row: { professionSlug: string; termSlug?: string | null; areaSlug: string }): string {
  return row.termSlug ? `/${row.professionSlug}/${row.termSlug}/in/${row.areaSlug}` : `/${row.professionSlug}/in/${row.areaSlug}`;
}

export function profilePath(slug: string): string {
  return `/profile/${slug}`;
}

export function eventPath(id: string): string {
  return `/events/${id}`;
}
