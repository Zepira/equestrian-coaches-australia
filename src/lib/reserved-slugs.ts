/**
 * Words a profession's slug can never take (The Site as a CMS §05.4).
 * Professions sit at the top level of the URL (/farriers), so a profession
 * called "search" or "about" would take over an existing page.
 *
 * Mirrors the `terms_profession_slug_not_reserved` check in
 * supabase/migrations/0016_competitions_sponsors_awards.sql (first set in the baseline). Change both together: this list
 * gives the admin form a friendly error, the constraint makes it impossible.
 * Every top-level route and public file belongs here.
 */
export const RESERVED_SLUGS = [
  "about", "account", "admin", "api", "auth", "clinics", "dashboard", "disciplines", "events",
  "for-coaches", "for-professionals", "forgot-password", "horse-care", "icon.png", "apple-icon.png", "join",
  "list-your-business", "login", "profile", "reset-password", "riding-instructors", "robots.txt", "search",
  "signup", "sitemap.xml", "brand", "hero", "vendor", "_next", "onboarding", "unsubscribe", "terms", "privacy",
  "go", "p", "email-preferences", "alerts", "how-we-list", "guides", "review", "reviews", "review-policy", "enquiry",
  "competitions", "riders-choice",
] as const;

export function isReservedSlug(slug: string) {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

/**
 * Words a discipline or speciality slug can never take: the second segment
 * of /[profession]/[term] shares its position with the `in` of
 * /[profession]/in/[area]. Mirrors `terms_term_slug_not_reserved`
 * (supabase/migrations/0002_reserved_term_slugs.sql).
 */
export const RESERVED_TERM_SLUGS = ["in"] as const;

export function isReservedTermSlug(slug: string) {
  return (RESERVED_TERM_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

/** The admin forms' check for any term: professions against the top-level list, the rest against `in`. */
export function reservedSlugError(kind: string, slug: string): string | null {
  if (kind === "profession" && isReservedSlug(slug)) return `"${slug}" is already a page on the site, so a profession can't use it.`;
  if (kind !== "profession" && isReservedTermSlug(slug)) return `"${slug}" is part of the site's addresses (/coaches/in/geelong), so it can't be a slug.`;
  return null;
}
