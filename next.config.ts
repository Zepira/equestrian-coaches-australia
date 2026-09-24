import type { NextConfig } from "next";

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

export default nextConfig;
