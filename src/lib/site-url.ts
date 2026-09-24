/**
 * The site's one base URL (CMS build stage 3). Sitemap, robots, canonical
 * tags, structured data, emails and Stripe return URLs all build absolute
 * addresses from here, so a domain change is one environment variable.
 * No imports: safe in client components, server code and scripts alike.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** "/profile/jane" → "https://…/profile/jane". Already-absolute URLs pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
