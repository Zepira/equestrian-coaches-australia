/**
 * Whether a request may run a cron job. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`. The /api/cron/* paths skip the test
 * host's password (src/proxy.ts), so this check is the only lock on them.
 *
 * Fails closed on Vercel: with no CRON_SECRET set there, nothing runs. Off
 * Vercel (a developer's machine, the local test suites) a missing secret lets
 * the jobs be called by hand.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return !process.env.VERCEL;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
