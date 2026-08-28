import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: an unrelated package-lock.json sits one level up
  // in the parent "Personal Repos" folder, which otherwise confuses
  // Turbopack's root detection.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
