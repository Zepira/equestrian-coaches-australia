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
 * An absolute URL on the **public** host, for a link a member of the public
 * has to be able to open: the unsubscribe button in an email, and the email
 * preferences page.
 *
 * Before launch those two are the whole of the site a stranger can reach, and
 * NEXT_PUBLIC_SITE_URL points at the test host (docs/launch.md sets it that
 * way deliberately, so test emails keep test links). A waitlist confirmation
 * built on SITE_URL therefore told people to unsubscribe at
 * test.equineprofessionals.com.au, which asks them for a password they do not
 * have: an unsubscribe link that cannot be used. isPreLaunchPath in
 * src/proxy.ts lets both paths through on the public host for exactly this.
 *
 * Falls back to SITE_URL when PUBLIC_HOST is unset, which is local
 * development. Server side only in practice: PUBLIC_HOST is not a
 * NEXT_PUBLIC_ variable, so in a browser this is SITE_URL. Every caller
 * builds these links on the server.
 */
export function publicUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const host = (process.env.PUBLIC_HOST ?? "").trim().toLowerCase().replace(/\.$/, "");
  const base = host ? `https://${host}` : SITE_URL;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
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
 * The shared inbox people are told to write to, and the Reply-To on every
 * email the site sends. It has to be a mailbox somebody reads.
 *
 * Defaults to the .com.au domain, which is the one that carries the MX records
 * and the real mailbox; the .au form this used to name is not attached to
 * anything. An environment variable so it can move to the Gmail address later
 * without a deploy.
 */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "hello@equineprofessionals.com.au";
