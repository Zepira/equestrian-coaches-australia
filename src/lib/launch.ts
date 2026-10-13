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
 * How open the public host is, in three steps (Trello "Build the coaches-only
 * stage", 12 Oct 2026):
 *
 *   soon      the coming soon page and the policies, nothing else (default)
 *   coaches   professionals can join, set up and pay: the coach paths below
 *             open on the public host, everything a rider would use still
 *             shows the coming soon page, and nothing new is indexed
 *   launched  the whole site, indexable
 *
 * SITE_STAGE=coaches or SITE_STAGE=launched sets it. SITE_LAUNCHED="true"
 * still means launched, so a deployment set up before stages existed keeps
 * working. Anything else, unset included, is "soon": fails closed.
 */
export type SiteStage = "soon" | "coaches" | "launched";
export const SITE_STAGE: SiteStage =
  process.env.SITE_LAUNCHED === "true" || process.env.SITE_STAGE === "launched" ? "launched" : process.env.SITE_STAGE === "coaches" ? "coaches" : "soon";

/** The whole site is open (the old single switch, kept for its many readers). */
export const SITE_LAUNCHED = SITE_STAGE === "launched";

/**
 * What a professional needs before riders arrive: the pitch, joining,
 * signing in, onboarding, the dashboard (billing included), their public
 * profile to check and share, collecting reviews and testimonials, and what
 * those pages call. Search, area and profession pages, events and rider
 * accounts stay behind the coming soon page. Admin stays on the test host.
 */
const COACH_STAGE_EXACT = new Set([
  "/for-coaches",
  "/for-professionals",
  "/list-your-business",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/about",
  "/how-we-list",
]);
const COACH_STAGE_PREFIXES = ["/join/", "/auth/", "/onboarding/", "/dashboard", "/profile/", "/review/", "/testimonial/", "/go/", "/api/"];

export function isCoachStagePath(path: string): boolean {
  return COACH_STAGE_EXACT.has(path) || COACH_STAGE_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p));
}

/**
 * Set by the proxy on a coach page the coaches stage opened, so the root
 * layout shows the header and footer (trimmed) rather than treating it as
 * the coming soon page.
 */
export const COACH_STAGE_HEADER = "x-coach-stage";

/**
 * Mock payments hand out a real active plan without a card, so they must
 * never run where the public can reach them. Fine on localhost and the
 * password-protected test hosts; refused on the public host.
 */
export function mockPaymentsAllowed(host: string | null | undefined): boolean {
  if (host && isLocalHost(host)) return true;
  return isGatedHost(host);
}

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
 * Whether this request gets the coming soon page instead of the site.
 *
 * Only ever true on the public host: showing a test host a coming soon page
 * would defeat the point of having one.
 *
 * Local development is deliberately excluded, so `npm run dev` with no
 * environment set shows the real site rather than the coming soon page. To
 * preview that page locally, point PUBLIC_HOST at localhost, which is what the
 * check below reads. Without this a developer with an empty .env sees the
 * coming soon page at "/" and reasonably concludes the home page is broken.
 */
export function showsComingSoon(host: string | null | undefined): boolean {
  // Still true in the coaches stage: "/" and every rider path show it there.
  if (SITE_LAUNCHED) return false;
  if (host && isLocalHost(host)) return PUBLIC_HOST !== "" && isLocalHost(PUBLIC_HOST);
  return isPublicHost(host);
}
