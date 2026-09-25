/**
 * Which host is being served, and whether the site has launched.
 *
 * One Vercel project answers on several host names, and they do not all show
 * the same thing:
 *
 *   * the public host before launch  → the coming soon page, nothing else
 *   * the public host after launch   → the whole site, indexable
 *   * every other host               → the whole site behind a password,
 *                                      never indexable
 *
 * "Every other host" is deliberately the default rather than a list of test
 * hosts, so a name nobody thought about — a preview deployment, the project's
 * own *.vercel.app address, a domain pointed here by mistake — is password
 * protected and noindex without anyone remembering to add it.
 *
 * Environment variables, not the settings table, because the request proxy
 * decides this on every request at the edge: a database read per request for
 * one boolean is the wrong trade, and a setting that fails to load would fail
 * open. CLAUDE.md's "configuration over hardcoding" rule still holds — this
 * is configuration, it just lives where the proxy can reach it.
 *
 * Everything here fails closed. A missing SITE_LAUNCHED means not launched; a
 * missing PUBLIC_HOST means no host is public; a gated host with no password
 * set is refused rather than served open.
 *
 * No imports, so the proxy (edge runtime), server components, route handlers
 * and scripts can all read it.
 */

/** Lower-cased, port and trailing dot removed, so comparisons are stable. */
export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
}

/** The one host that serves the site publicly, e.g. "equineprofessionals.com.au". */
export const PUBLIC_HOST = normaliseHost(process.env.PUBLIC_HOST ?? "");

/**
 * True only for the exact string "true". Anything else, including unset, a
 * typo or the string "1", means the site has not launched: the coming soon
 * page is what the public sees until someone deliberately sets this.
 */
export const SITE_LAUNCHED = process.env.SITE_LAUNCHED === "true";

/** Local development, where no password or launch gate applies. */
export function isLocalHost(host: string): boolean {
  const h = normaliseHost(host);
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
}

/**
 * Whether this host is the public one. Unknown hosts are not public, which is
 * what makes preview and *.vercel.app addresses gated by default.
 */
export function isPublicHost(host: string | null | undefined): boolean {
  if (!host) return false;
  if (isLocalHost(host)) return true;
  return PUBLIC_HOST !== "" && normaliseHost(host) === PUBLIC_HOST;
}

/** Whether this host needs the password and the noindex header. */
export function isGatedHost(host: string | null | undefined): boolean {
  if (host && isLocalHost(host)) return false;
  return !isPublicHost(host);
}

/**
 * Whether the visitor may see the site itself, as opposed to the coming soon
 * page. Gated hosts always may — showing a test site a coming soon page would
 * defeat its purpose — so this is only ever false on the public host.
 */
export function showsFullSite(host: string | null | undefined): boolean {
  if (host && isLocalHost(host)) return true;
  return isGatedHost(host) || SITE_LAUNCHED;
}
