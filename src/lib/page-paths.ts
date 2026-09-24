/**
 * URLs for the pages the database knows about but doesn't store paths for
 * (The Site as a CMS §04: "no URLs stored"). indexable_pages holds a
 * profession, an optional term and an area; this turns a row into today's
 * address. The route move (CMS build stage 3) changes this file and nothing
 * else, and the sitemap follows.
 *
 * Returns null where no route exists yet: horse care area pages arrive with
 * the stage 3 profession template, so until then they stay out of the
 * sitemap rather than pointing at a 404.
 */
export function areaPagePath(row: { professionSlug: string; termSlug?: string | null; areaSlug: string }): string | null {
  if (row.professionSlug !== "coaches") return null;
  return row.termSlug ? `/disciplines/${row.termSlug}/${row.areaSlug}` : `/riding-instructors/${row.areaSlug}`;
}

/** A provider's public profile. Coaches keep /coaches/[slug] until stage 3 moves everyone to /profile/[slug]. */
export function providerPath(slug: string, primaryProfessionSlug: string | null | undefined): string {
  return primaryProfessionSlug === "coaches" || !primaryProfessionSlug ? `/coaches/${slug}` : `/profile/${slug}`;
}
