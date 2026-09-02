import { redirect } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { CoachResultsGrid } from "@/components/coach-results-grid";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { mergeAndSortByDistance } from "@/lib/merge-coach-results";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";

// Discipline × area — only rendered where indexable_pages says 3+ real
// coaches teach this discipline in this area (spec: "What earns a page").
// Below that, redirect to the parent /disciplines/[slug] page, which
// always exists — a real parent, unlike /riding-instructors/[area] which
// has no area hierarchy to fall back to yet.
export async function generateMetadata({ params }: { params: Promise<{ slug: string; area: string }> }) {
  const { slug, area: areaSlug } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "Coaches" };

  const [{ data: discipline }, { data: area }] = await Promise.all([
    supabase.from("terms").select("name").eq("slug", slug).eq("kind", "discipline").maybeSingle(),
    supabase.from("areas").select("name, state").eq("slug", areaSlug).maybeSingle(),
  ]);
  if (!discipline || !area) return { title: "Coaches" };

  return {
    title: `${discipline.name} coaches in ${area.name}, ${area.state}`,
    description: `Find ${discipline.name.toLowerCase()} coaches in ${area.name}, ${area.state}, Australia.`,
  };
}

export default async function DisciplineAreaPage({
  params,
}: {
  params: Promise<{ slug: string; area: string }>;
}) {
  const { slug, area: areaSlug } = await params;
  const supabase = await createClient();
  if (!supabase) redirect(`/disciplines/${slug}`);

  const disciplines = await getDisciplines(supabase);
  const discipline = disciplines.find((d) => d.slug === slug);
  if (!discipline) redirect("/search");

  const { data: area } = await supabase
    .from("areas")
    .select("id, name, state, lat, long, default_radius_km")
    .eq("slug", areaSlug)
    .maybeSingle();
  if (!area) redirect(`/disciplines/${slug}`);

  const { data: page } = await supabase
    .from("indexable_pages")
    .select("eligible")
    .eq("area_id", area.id)
    .eq("discipline_id", discipline.id)
    .maybeSingle();
  if (!page?.eligible) redirect(`/disciplines/${slug}`);

  const radiusKm = area.default_radius_km ?? 50;
  const coaches = mergeAndSortByDistance(
    await searchCoaches(supabase, { disciplineIds: [discipline.id], lat: area.lat, long: area.long, radiusKm }),
    searchMockCoaches({ disciplineSlugs: [slug], lat: area.lat, long: area.long, radiusKm })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: `${discipline.name} coaches`, url: `/disciplines/${slug}` },
            { name: area.name, url: `/disciplines/${slug}/${areaSlug}` },
          ]),
          ...(coaches.length > 0
            ? [itemListSchema(coaches.map((c) => ({ name: c.name, url: `/coaches/${c.slug}` })))]
            : []),
        ]}
      />
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">
        {discipline.name} coaches in {area.name}, {area.state}
      </h1>
      <p className="mt-2 max-w-xl text-muted">{discipline.blurb}</p>

      <div className="mt-6">
        <SearchBar defaultDiscipline={slug} defaultLocation={`${area.name} ${area.state}`} />
      </div>

      <p className="mt-6 text-sm text-muted">
        {coaches.length} {discipline.name.toLowerCase()} coach{coaches.length === 1 ? "" : "es"} in {area.name}
      </p>

      <CoachResultsGrid coaches={coaches} />
    </div>
  );
}
