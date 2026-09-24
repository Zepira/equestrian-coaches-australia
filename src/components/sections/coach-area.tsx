import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { CoachResultCard } from "@/components/coach-result-card";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { getAttributes, getDisciplines, getSkills, searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";
import { toTermOption } from "@/lib/term-options";
import { absoluteUrl } from "@/lib/site-url";
import { areaPagePath, disciplinePath, profilePath } from "@/lib/page-paths";
import { getArea, isAreaPageEligible, redirectMissingTerm } from "@/lib/sections";
import type { Profession } from "@/lib/professions";

/**
 * /coaches/in/[area] and /coaches/[discipline]/in/[area]. The first catches
 * "riding instructor near me", which out-searches any one discipline name
 * ("How Riders Find Us"); the second is one discipline in one place.
 *
 * Both render only where indexable_pages says enough real coaches serve the
 * place (spec: "What earns a page"). Below the gate they redirect, never
 * 404: the discipline + area page to its discipline page, which always
 * exists; the area page to /search pre-filled with the place, since areas
 * have no hierarchy above the suburb yet.
 */
export async function coachAreaMetadata(areaSlug: string, disciplineSlug?: string): Promise<Metadata> {
  const supabase = await createClient();
  const area = await getArea(areaSlug);
  if (!supabase || !area) return { title: "Riding instructors" };
  const canonical = absoluteUrl(areaPagePath({ professionSlug: "coaches", termSlug: disciplineSlug, areaSlug }));
  if (!disciplineSlug) {
    return {
      title: `Riding instructors in ${area.name}, ${area.state}`,
      description: `Find riding instructors and coaches in ${area.name}, ${area.state}: search by discipline, from dressage to Western to liberty.`,
      alternates: { canonical },
    };
  }
  const discipline = (await getDisciplines(supabase)).find((d) => d.slug === disciplineSlug);
  if (!discipline) return { title: "Coaches" };
  return {
    title: `${discipline.name} coaches in ${area.name}, ${area.state}`,
    description: `Find ${discipline.name.toLowerCase()} coaches in ${area.name}, ${area.state}, Australia.`,
    alternates: { canonical },
  };
}

export async function CoachArea({ profession, areaSlug, disciplineSlug }: { profession: Profession; areaSlug: string; disciplineSlug?: string }) {
  const supabase = await createClient();
  const [disciplines, skills, attributes] = await Promise.all([getDisciplines(supabase), getSkills(supabase), getAttributes(supabase)]);
  const discipline = disciplineSlug ? disciplines.find((d) => d.slug === disciplineSlug) : undefined;
  if (disciplineSlug && !discipline) return redirectMissingTerm(profession, disciplineSlug, `/in/${areaSlug}`);

  const parent = discipline ? disciplinePath(discipline.slug) : "/search";
  const area = await getArea(areaSlug);
  if (!supabase || !area) redirect(parent);
  if (!(await isAreaPageEligible(profession.id, area.id, discipline?.id ?? null))) {
    redirect(discipline ? parent : `/search?location=${encodeURIComponent(`${area.name} ${area.state}`)}`);
  }

  const radiusKm = area.default_radius_km ?? 50;
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const coaches = [
    ...(await searchCoaches(supabase, { disciplineIds: discipline ? [discipline.id] : undefined, lat: area.lat, long: area.long, radiusKm })),
    ...searchMockCoaches({ disciplineSlugs: discipline ? [discipline.slug] : undefined, lat: area.lat, long: area.long, radiusKm }),
  ].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  const self = areaPagePath({ professionSlug: profession.slug, termSlug: discipline?.slug, areaSlug });
  const noun = discipline ? `${discipline.name.toLowerCase()} coach` : "coach";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Coaches", url: "/coaches" },
            ...(discipline ? [{ name: `${discipline.name} coaches`, url: disciplinePath(discipline.slug) }] : []),
            { name: area.name, url: self },
          ]),
          ...(coaches.length > 0 ? [itemListSchema(coaches.map((c) => ({ name: c.name, url: profilePath(c.slug) })))] : []),
        ]}
      />
      <h1 className="font-display text-[38px] leading-none -tracking-[0.01em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.02em]">
        {discipline ? `${discipline.name} coaches` : "Riding instructors"} in <em className="italic text-accent">{area.name}</em>, {area.state}
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        {discipline ? discipline.blurb : `Coaches across every discipline serving ${area.name} and nearby areas.`}
      </p>

      <div className="mt-6">
        <SearchBar
          defaultDiscipline={discipline?.slug}
          defaultLocation={`${area.name} ${area.state}`}
          tone="plain"
          skills={skills.map(toTermOption)}
          attributes={attributes.map(toTermOption)}
          disciplineOptions={disciplines.map(toTermOption)}
        />
      </div>

      <p className="mt-6 text-sm text-muted">
        {coaches.length} {noun}
        {coaches.length === 1 ? "" : "es"} in {area.name}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {coaches.map((coach) => (
          <CoachResultCard key={coach.slug} coach={coach} />
        ))}
      </div>
    </div>
  );
}
