import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineFilter } from "@/components/discipline-filter";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, resolveLocation, searchCoaches } from "@/lib/supabase/queries";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { logSearchEvent } from "@/lib/search-events";

// noindex, follow — faceted URLs are the classic directory crawl-budget
// disaster (spec: "What earns a page"). /disciplines/[slug] is the
// indexable equivalent for a single discipline.
export const metadata = {
  title: "Find a coach",
  description:
    "Search riding coaches across Australia by discipline and location — bridleless, working equitation, dressage and more.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; location?: string }>;
}) {
  const { d = "", location = "" } = await searchParams;
  const disciplineSlugs = d.split(",").filter(Boolean);
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);

  let results;
  let locationNotFound = false;

  if (supabase) {
    const disciplineIds = disciplines
      .filter((disc) => disciplineSlugs.includes(disc.slug))
      .map((disc) => disc.id);
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

    results = await searchCoaches(supabase, { disciplineIds, lat, long, radiusKm: 100 });

    // Mock data merge — see src/lib/mock-coaches.ts to remove.
    results = [
      ...results,
      ...searchMockCoaches({ disciplineSlugs, lat, long, radiusKm: 100 }),
    ].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    // search_events — logged regardless of hit/miss, the zero-result rows
    // are the interesting ones (supply gap vs vocabulary gap).
    await logSearchEvent({
      termIds: disciplineIds,
      locationText: location || null,
      lat,
      lng: long,
      radiusKm: 100,
      resultCount: results.length,
    });
  } else {
    // Placeholder filtering — used only when Supabase isn't configured.
    results = placeholderCoaches
      .filter((coach) => {
        const matchesDiscipline =
          disciplineSlugs.length === 0 || coach.disciplines.some((s) => disciplineSlugs.includes(s));
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

      {/* Multi-select — OR within disciplines, e.g. "dressage or show jumping" */}
      <div className="mt-6">
        <DisciplineFilter disciplines={disciplines} />
      </div>

      {locationNotFound && (
        <p className="mt-6 rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
          Couldn&apos;t find &ldquo;{location}&rdquo; — showing results for any location instead.
        </p>
      )}

      <p className="mt-6 text-sm text-muted">
        {results.length} coach{results.length === 1 ? "" : "es"} found
        {location && !locationNotFound ? ` near ${location}` : ""}
      </p>

      {results.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((coach) => (
            <CoachCard key={coach.slug} coach={coach} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-muted">
          No coaches match that search yet. Try a different discipline or a wider area.
        </div>
      )}
    </div>
  );
}
