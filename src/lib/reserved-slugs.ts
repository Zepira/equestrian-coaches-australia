/**
 * Words a profession's slug can never take (The Site as a CMS §05.4).
 * Professions sit at the top level of the URL (/farriers), so a profession
 * called "search" or "about" would take over an existing page.
 *
 * Mirrors the `terms_profession_slug_not_reserved` check in
 * supabase/migrations/0001_baseline.sql. Change both together: this list
 * gives the admin form a friendly error, the constraint makes it impossible.
 * Every top-level route and public file belongs here.
 */
export const RESERVED_SLUGS = [
  "about", "account", "admin", "api", "auth", "clinics", "dashboard", "disciplines", "events",
  "for-coaches", "for-professionals", "forgot-password", "horse-care", "icon.png", "apple-icon.png", "join",
  "list-your-business", "login", "profile", "reset-password", "riding-instructors", "robots.txt", "search",
  "signup", "sitemap.xml", "brand", "hero", "vendor", "_next",
] as const;

export function isReservedSlug(slug: string) {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}
