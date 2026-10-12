import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Pin the workspace root: an unrelated package-lock.json sits one level up
  // in the parent "Personal Repos" folder, which otherwise confuses
  // Turbopack's root detection.
  turbopack: {
    root: __dirname,
  },

  // The admin handbook reads these HTML files from disk at request time. Next
  // cannot trace a dynamic fs.readFile, so without this the files are left out
  // of the serverless bundle and every document 404s on Vercel while working
  // perfectly in dev.
  outputFileTracingIncludes: {
    "/admin/handbook/[slug]/raw": ["./content/handbook/**"],
  },

  // The addresses before the route move (CMS build stage 3). Pattern-shaped
  // moves live here; the ones that need the database (an old
  // /coaches/<provider> profile link, a renamed discipline slug) are
  // resolved by redirectMissingTerm in src/lib/sections.ts. The full old→new
  // list, for Search Console or a domain move, comes from
  // scripts/db/redirect-map.mjs.
  async redirects() {
    return [
      { source: "/disciplines", destination: "/coaches#disciplines", permanent: true },
      { source: "/disciplines/:discipline", destination: "/coaches/:discipline", permanent: true },
      { source: "/disciplines/:discipline/:area", destination: "/coaches/:discipline/in/:area", permanent: true },
      { source: "/riding-instructors/:area", destination: "/coaches/in/:area", permanent: true },
      { source: "/clinics/:id", destination: "/events/:id", permanent: true },
    ];
  },
};

/**
 * Sentry (src/instrumentation.ts, src/instrumentation-client.ts). Source maps
 * upload only when SENTRY_AUTH_TOKEN is set (on Vercel), so a build without
 * it works the same; they're deleted from the deployment after upload, so
 * the site's source isn't served publicly. Browser reports go through
 * /monitoring on our own host, past ad blockers.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
});
