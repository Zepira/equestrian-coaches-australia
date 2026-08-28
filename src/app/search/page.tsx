import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineTag } from "@/components/discipline-tag";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, resolveLocation, searchCoaches } from "@/lib/supabase/queries";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";

export const metadata = { title: "Find a coach" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ discipline?: string; location?: string }>;
}) {
  const { discipline = "", location = "" } = await searchParams;
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);

  let results;
  let locationNotFound = false;

  if (supabase) {
    const selected = disciplines.find((d) => d.slug === discipline);
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

    results = await searchCoaches(supabase, {
      disciplineId: selected?.id ?? null,
      lat,
      long,
      radiusKm: 100,
    });

    // Mock data merge — see src/lib/mock-coaches.ts to remove.
    results = [
      ...results,
      ...searchMockCoaches({ disciplineSlug: discipline || null, lat, long, radiusKm: 100 }),
    ].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else {
    // Placeholder filtering — used only when Supabase isn't configured.
    results = placeholderCoaches
      .filter((coach) => {
        const matchesDiscipline = !discipline || coach.disciplines.includes(discipline);
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
        <SearchBar defaultDiscipline={discipline} defaultLocation={location} />
      </div>

      {/* Discipline quick filters — horizontal scroller on mobile, wraps on desktop */}
      <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {disciplines.map((d) => (
          <div key={d.slug} className="shrink-0">
            <DisciplineTag slug={d.slug} active={d.slug === discipline} />
          </div>
        ))}
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
