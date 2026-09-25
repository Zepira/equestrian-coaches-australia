import { titleCase } from "@/lib/text";
import { SearchResults } from "@/components/search-results";
import type { CoachResultData } from "@/components/coach-result-card";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSkills, getAttributes, resolveSearchLocation, searchProviders } from "@/lib/supabase/queries";
import { toTermOption } from "@/lib/term-options";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { searchMockProfessionals } from "@/lib/mock-professionals";
import { logSearchEvent } from "@/lib/search-events";
import { logImpressions } from "@/lib/coach-events";
import { getProfession } from "@/lib/cms/read";
import { getSectionTerms } from "@/lib/sections";
import { pickFeatured } from "@/lib/featured";
import type { Profession } from "@/lib/professions";
import { getSamples } from "@/lib/samples";
import { getAlertWordings } from "@/components/subscribe-card";

// noindex, follow — faceted URLs are the classic directory crawl-budget
// disaster (spec: "What earns a page"). /coaches/[discipline] and
// /farriers/[speciality] are the indexable equivalents.
export const metadata = {
  title: "Search",
  description: "Search riding coaches, farriers, vets and the rest across Australia, by what you need and where you are.",
  robots: { index: false, follow: true },
};

const RADII = [25, 50, 75, 100, 125, 150];

/** The profession being searched: `p` when it names a live one, else coaching. */
async function scope(p: string | undefined): Promise<Profession | null> {
  const picked = p ? await getProfession(p) : undefined;
  if (picked?.open) return picked;
  return (await getProfession("coaches")) ?? null;
}

/**
 * /search, scoped to one profession (The Site as a CMS §05.1): `p` picks it
 * (coaching when absent), `d` its disciplines or specialities, `s`/`a`
 * coaching's skills and setup. nearby_providers() does the matching: based
 * in the area above travels to it, remote providers last and only where the
 * profession allows it, never two doors in one list.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; d?: string; s?: string; a?: string; location?: string; r?: string; new?: string; edit?: string }>;
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
  const profession = await scope(sp.p);
  const coaching = !profession || profession.door === "coaches";

  // Coaching searches its disciplines, skills and setup; another profession
  // its specialities only (skills and setup are coaching's vocabulary today).
  const [disciplines, skills, attributes] = coaching
    ? await Promise.all([getDisciplines(supabase), getSkills(supabase), getAttributes(supabase)])
    : [await getSectionTerms(profession.id), [], []];

  let results: CoachResultData[];
  let featured: CoachResultData[] = [];
  let origin: { lat: number; long: number } | null = null;
  let searchTown: string | null = null;
  // The place an alert card offers; a state-wide search has none, so the card asks.
  let alertPlace: string | null = null;
  let stateWide: string | null = null;
  let locationNotFound = false;

  if (supabase && profession) {
    const disciplineIds = disciplines.filter((t) => disciplineSlugs.includes(t.slug)).map((t) => t.id);
    const skillIds = skills.filter((t) => skillSlugs.includes(t.slug)).map((t) => t.id);
    const attributeIds = attributes.filter((t) => attributeSlugs.includes(t.slug)).map((t) => t.id);
    let lat: number | null = null;
    let long: number | null = null;
    let state: string | null = null;

    if (location) {
      const resolved = await resolveSearchLocation(supabase, location);
      if (resolved?.kind === "state") {
        // "VIC" / "Victoria": every provider based in the state, no radius.
        state = resolved.state.code;
        stateWide = resolved.state.name;
        searchTown = resolved.state.name;
      } else if (resolved) {
        lat = resolved.lat;
        long = resolved.long;
        origin = { lat, long };
        searchTown = titleCase(resolved.suburb);
        alertPlace = `${titleCase(resolved.suburb)} ${resolved.state}`;
      } else {
        locationNotFound = true;
      }
    }

    const real = profession.id
      ? await searchProviders(supabase, [profession.id], { disciplineIds, skillIds, attributeIds, lat, long, radiusKm, state })
      : [];

    // Mock data merge — see src/lib/mock-coaches.ts and mock-professionals.ts to remove.
    const samples = await getSamples();
    const mock: CoachResultData[] = !samples.show(profession.slug)
      ? []
      : coaching
      ? searchMockCoaches({ disciplineSlugs, skillSlugs, attributeSlugs, lat, long, radiusKm, state })
      : searchMockProfessionals({
          professionSlug: profession.slug,
          lat,
          long,
          radiusKm,
          state,
          speciality: disciplines.find((t) => t.slug === disciplineSlugs[0])?.name ?? null,
        });

    results = [...real, ...mock]
      .filter((c) => !onlyTaking || c.takingStudents === "yes")
      // Nearest first when there's a point; alphabetical when there isn't
      // (state-wide or no location), so the order is at least predictable.
      // Real results keep the database's order within a distance (based in
      // above travels to, remote last).
      .sort((x, y) =>
        origin
          ? Number(Boolean(x.isRemote)) - Number(Boolean(y.isRemote)) || (x.distanceKm ?? Infinity) - (y.distanceKm ?? Infinity)
          : x.name.localeCompare(y.name)
      );

    featured = await pickFeatured(supabase, real, { point: Boolean(origin) });

    // provider_events.impression, one per real provider in the result set,
    // deduped per visitor per day (mock data is skipped by the logger).
    await logImpressions(real.map((r) => ({ id: r.id, professionId: r.professionId })));

    // search_events — logged regardless of hit/miss, the zero-result rows
    // are the interesting ones (supply gap vs vocabulary gap).
    await logSearchEvent({
      termIds: [...disciplineIds, ...skillIds, ...attributeIds],
      professionId: profession.id,
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
      featured={featured}
      origin={origin}
      searchTown={searchTown}
      stateWide={stateWide}
      locationText={location}
      radiusKm={radiusKm}
      editing={editing}
      disciplineSlug={disciplineSlugs[0] ?? ""}
      locationNotFound={locationNotFound}
      skills={skills.map(toTermOption)}
      attributes={attributes.map(toTermOption)}
      disciplineOptions={disciplines.map(toTermOption)}
      coachFacets={coaching}
      subscribe={{
        wordings: await getAlertWordings(),
        professionId: profession?.id ?? null,
        door: profession?.door ?? null,
        termId: disciplines.find((t) => t.slug === disciplineSlugs[0])?.id ?? null,
        place: alertPlace,
      }}
      nouns={
        profession
          ? { slug: profession.slug, singular: profession.singular, plural: profession.plural, termNoun: profession.termNoun }
          : undefined
      }
    />
  );
}
