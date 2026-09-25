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

/**
 * The origin this request actually came in on, e.g.
 * "https://test.equineprofessionals.com.au".
 *
 * SITE_URL is one build-time value, which is right for emails and Stripe
 * return URLs: they have to work from a cron, where there is no request. It is
 * wrong for anything a visitor or a crawler reads on the page, because one
 * deployment answers on several hosts. Telling a crawler on the public host
 * that the canonical version lives on the password-protected test host is
 * exactly how the one page meant to be indexed fails to be.
 *
 * Server only: it reads the request headers.
 */
export async function requestOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("host");
  if (!host) return SITE_URL;
  // Vercel terminates TLS at the edge and sets this; locally there is none.
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * The shared inbox people are told to write to. A placeholder until the
 * domain's email is set up (CLAUDE.md, the rename): change it here.
 */
export const CONTACT_EMAIL = "hello@equineprofessionals.au";
