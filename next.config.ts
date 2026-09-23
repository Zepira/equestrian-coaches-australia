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
};

export default nextConfig;
