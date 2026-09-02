import { SearchBar } from "@/components/search-bar";
import { CoachResultsGrid } from "@/components/coach-results-grid";
import { SearchFacets } from "@/components/search-facets";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, resolveLocation, searchCoaches } from "@/lib/supabase/queries";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { mergeAndSortByDistance } from "@/lib/merge-coach-results";
import { logSearchEvent } from "@/lib/search-events";

// noindex, follow — faceted URLs are the classic directory crawl-budget
// disaster (spec: "What earns a page"). /disciplines/[slug] is the
// indexable equivalent for a single discipline.
export const metadata = {
  title: "Find a coach",
  description:
    "Search riding coaches across Australia by discipline, skill and setup — bridleless, working equitation, dressage and more.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; s?: string; a?: string; location?: string }>;
}) {
  const { d = "", s = "", a = "", location = "" } = await searchParams;
  const disciplineSlugs = d.split(",").filter(Boolean);
  const skillSlugs = s.split(",").filter(Boolean);
  const attributeSlugs = a.split(",").filter(Boolean);
  const supabase = await createClient();
  const [disciplines, skills, attributes] = await Promise.all([
    getDisciplines(supabase),
    getSkills(supabase),
    getAttributes(supabase),
  ]);

  let results;
  let locationNotFound = false;

  if (supabase) {
    const disciplineIds = disciplines.filter((t) => disciplineSlugs.includes(t.slug)).map((t) => t.id);
    const skillIds = skills.filter((t) => skillSlugs.includes(t.slug)).map((t) => t.id);
    const attributeIds = attributes.filter((t) => attributeSlugs.includes(t.slug)).map((t) => t.id);
    let lat: number | null = null;
    let long: number | null = null;

    if (location) {
      const resolved = await resolveLocation(supabase, location);
      if (resolved) {
        lat = resolved.lat;
        long = resolved.long;
      } else {
        locationNotFound = true;
      }
    }

    results = await searchCoaches(supabase, { disciplineIds, skillIds, attributeIds, lat, long, radiusKm: 100 });

    // Mock data merge — see src/lib/mock-coaches.ts to remove.
    results = mergeAndSortByDistance(
      results,
      searchMockCoaches({ disciplineSlugs, skillSlugs, attributeSlugs, lat, long, radiusKm: 100 })
    );

    // search_events — logged regardless of hit/miss, the zero-result rows
    // are the interesting ones (supply gap vs vocabulary gap).
    await logSearchEvent({
      termIds: [...disciplineIds, ...skillIds, ...attributeIds],
      locationText: location || null,
      lat,
      lng: long,
      radiusKm: 100,
      resultCount: results.length,
    });
  } else {
    // Placeholder filtering — used only when Supabase isn't configured.
    // No skill/attribute data on placeholder coaches, so those facets are
    // a no-op here rather than filtering everything out.
    results = placeholderCoaches
      .filter((coach) => {
        const matchesDiscipline =
          disciplineSlugs.length === 0 || coach.disciplines.some((slug) => disciplineSlugs.includes(slug));
        const matchesLocation =
          !location || coach.suburb.toLowerCase().includes(location.toLowerCase().split(" ")[0]);
        return matchesDiscipline && matchesLocation;
      })
      .map(toCoachCardData);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">Find a coach</h1>
      <div className="mt-4">
        <SearchBar defaultDiscipline={disciplineSlugs[0] ?? ""} defaultLocation={location} />
      </div>

      {/* Multi-select facets — OR within a facet, AND across facets, e.g.
          "dressage or show jumping" AND "confidence building" AND "own arena".
          Pill dropdowns, not every option rendered flat — the discipline
          list alone is ~19 options, skills+setup another ~47. */}
      <div className="mt-6">
        <SearchFacets disciplines={disciplines} skills={skills} attributes={attributes} />
      </div>

      {locationNotFound && (
        <p className="mt-6 rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
          Couldn&apos;t find &ldquo;{location}&rdquo; — showing results for any location instead.
        </p>
      )}

      <p className="mt-6 text-sm text-muted">
        {results.length} coach{results.length === 1 ? "" : "es"} found
        {location && !locationNotFound ? ` near ${location}` : ""}
      </p>

      <CoachResultsGrid
        coaches={results}
        emptyState="No coaches match that search yet. Try a different discipline, skill or a wider area."
      />
    </div>
  );
}
