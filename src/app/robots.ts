import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site-url";
import { isGatedHost, showsFullSite } from "@/lib/launch";

/**
 * Three answers, one per kind of host (src/lib/launch.ts).
 *
 * Reading the request's host makes this a dynamic route rather than a file
 * built once, which is the point: one deployment serves several hosts and they
 * must not all claim to be the indexable one.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  // A test or preview host: nothing here is for the index. The X-Robots-Tag
  // header the proxy sets is what actually keeps these pages out — robots.txt
  // only stops the crawl, not the indexing of a URL someone links to — so this
  // is the belt to that brace.
  if (isGatedHost(host)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  // The public host before launch: the coming soon page is worth indexing, so
  // that searching the business's name finds it. Nothing else exists yet.
  if (!showsFullSite(host)) {
    return {
      rules: [{ userAgent: "*", allow: "/$", disallow: "/" }],
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/api", "/login", "/signup", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
