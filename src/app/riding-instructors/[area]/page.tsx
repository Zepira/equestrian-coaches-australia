import { redirect } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";

// "riding instructor near me" catches far more search volume than any one
// discipline name (see CLAUDE.md, "How Riders Find Us" spec) — this page
// is the all-disciplines equivalent of /disciplines/[slug], gated the same
// way: only rendered where indexable_pages says 3+ real coaches serve the
// area. Below that, redirect to /search pre-filled with the area — never
// 404, per the spec's "What earns a page" rule. There's no area hierarchy
// built yet (areas are suburb-only, see 0009_areas.sql), so /search is the
// closest thing to a "parent" page today; revisit once regions/states get
// their own area rows.
export async function generateMetadata({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaSlug } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "Riding instructors" };

  const { data: area } = await supabase.from("areas").select("name, state").eq("slug", areaSlug).maybeSingle();
  if (!area) return { title: "Riding instructors" };

  return {
    title: `Riding instructors in ${area.name}, ${area.state}`,
    description: `Find riding instructors and coaches in ${area.name}, ${area.state} — search by discipline, from dressage to Western to liberty.`,
  };
}

export default async function RidingInstructorsAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaSlug } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/search");

  const { data: area } = await supabase
    .from("areas")
    .select("id, name, state, lat, long, default_radius_km")
    .eq("slug", areaSlug)
    .maybeSingle();
  if (!area) redirect("/search");

  const { data: page } = await supabase
    .from("indexable_pages")
    .select("eligible")
    .eq("area_id", area.id)
    .is("discipline_id", null)
    .maybeSingle();
  if (!page?.eligible) redirect(`/search?location=${encodeURIComponent(`${area.name} ${area.state}`)}`);

  const radiusKm = area.default_radius_km ?? 50;
  const coaches = [
    ...(await searchCoaches(supabase, { lat: area.lat, long: area.long, radiusKm })),
    ...searchMockCoaches({ lat: area.lat, long: area.long, radiusKm }),
  ].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">
        Riding instructors in {area.name}, {area.state}
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        Coaches across every discipline serving {area.name} and nearby areas.
      </p>

      <div className="mt-6">
        <SearchBar defaultLocation={`${area.name} ${area.state}`} />
      </div>

      <p className="mt-6 text-sm text-muted">
        {coaches.length} coach{coaches.length === 1 ? "" : "es"} listed
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <CoachCard key={coach.slug} coach={coach} />
        ))}
      </div>
    </div>
  );
}
