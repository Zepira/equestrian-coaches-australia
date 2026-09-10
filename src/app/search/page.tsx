import { titleCase } from "@/lib/text";
import { SearchResults } from "@/components/search-results";
import type { CoachResultData } from "@/components/coach-result-card";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, resolveLocation, searchCoaches } from "@/lib/supabase/queries";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { logSearchEvent } from "@/lib/search-events";
import { logImpressions } from "@/lib/coach-events";

// noindex, follow — faceted URLs are the classic directory crawl-budget
// disaster (spec: "What earns a page"). /disciplines/[slug] is the
// indexable equivalent for a single discipline.
export const metadata = {
  title: "Find a coach",
  description:
    "Search riding coaches across Australia by discipline, skill and setup — bridleless, working equitation, dressage and more.",
  robots: { index: false, follow: true },
};

const RADII = [25, 50, 75, 100, 125, 150];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; s?: string; a?: string; location?: string; r?: string; new?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const { d = "", s = "", a = "", location = "" } = sp;
  const radiusKm = RADII.includes(Number(sp.r)) ? Number(sp.r) : 50;
  const onlyTaking = sp.new === "1";
  const editing = sp.edit === "1";
  const disciplineSlugs = d.split(",").filter(Boolean);
  const skillSlugs = s.split(",").filter(Boolean);
  const attributeSlugs = a.split(",").filter(Boolean);
  const supabase = await createClient();
  const [disciplines, skills, attributes] = await Promise.all([
    getDisciplines(supabase),
    getSkills(supabase),
    getAttributes(supabase),
  ]);

  let results: CoachResultData[];
  let origin: { lat: number; long: number } | null = null;
  let searchTown: string | null = null;
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
        origin = { lat, long };
        searchTown = titleCase(resolved.suburb);
      } else {
        locationNotFound = true;
      }
    }

    const real = await searchCoaches(supabase, { disciplineIds, skillIds, attributeIds, lat, long, radiusKm });

    // Mock data merge — see src/lib/mock-coaches.ts to remove.
    results = [...real, ...searchMockCoaches({ disciplineSlugs, skillSlugs, attributeSlugs, lat, long, radiusKm })]
      .filter((c) => !onlyTaking || c.takingStudents === "yes")
      .sort((x, y) => (x.distanceKm ?? Infinity) - (y.distanceKm ?? Infinity));

    // coach_events.impression — one per real coach in the result set,
    // deduped per visitor per day (mock coaches are skipped by the logger).
    await logImpressions(real.map((r) => r.id));

    // search_events — logged regardless of hit/miss, the zero-result rows
    // are the interesting ones (supply gap vs vocabulary gap).
    await logSearchEvent({
      termIds: [...disciplineIds, ...skillIds, ...attributeIds],
      locationText: location || null,
      lat,
      lng: long,
      radiusKm,
      resultCount: results.length,
    });
  } else {
    // Placeholder filtering — used only when Supabase isn't configured.
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
    <SearchResults
      results={results}
      origin={origin}
      searchTown={searchTown}
      locationText={location}
      radiusKm={radiusKm}
      editing={editing}
      disciplineSlug={disciplineSlugs[0] ?? ""}
      locationNotFound={locationNotFound}
    />
  );
}
