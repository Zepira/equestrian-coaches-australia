/**
 * Shared Sentry settings for the browser, the server and the edge
 * (src/instrumentation.ts, src/instrumentation-client.ts). Safe anywhere.
 *
 * - Off without NEXT_PUBLIC_SENTRY_DSN: local development and any machine
 *   without the key send nothing.
 * - Errors only, no performance tracing or session replay, which keeps us in
 *   the free tier and keeps what we send small.
 * - No personal data: no IP addresses, cookies or request bodies
 *   (sendDefaultPii off). The privacy policy says what goes (an error, the
 *   page, the browser) and where (Sentry, in the United States).
 * - The environment says which deployment it came from, so test-site errors
 *   can be told from production ones.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
  sendDefaultPii: false,
};
