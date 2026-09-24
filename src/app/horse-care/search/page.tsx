import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfessionalListing } from "@/components/professional-listing";
import { getProfessionBySlug, sectionHref } from "@/lib/professions";

export const metadata: Metadata = {
  title: "Search horse care",
  // Faceted results, like /search for coaches: crawl the links, don't index the page.
  robots: { index: false, follow: true },
};

/**
 * Every horse care professional near a place ("Any profession" on the
 * search card). The card's no-JavaScript path also lands here, with `p`
 * set when a profession was picked, which redirects to that section.
 */
export default async function HorseCareSearchPage({ searchParams }: { searchParams: Promise<{ p?: string; location?: string }> }) {
  const { p, location = "" } = await searchParams;
  const picked = p ? getProfessionBySlug(p) : undefined;
  if (picked) redirect(sectionHref(picked) + (location.trim() ? `?location=${encodeURIComponent(location.trim())}` : ""));
  return <ProfessionalListing location={location} />;
}
