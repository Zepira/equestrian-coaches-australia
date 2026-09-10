import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, resolveLocation, searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";

// "N nearby" for the hero search card: how many coaches (real + mock) sit
// within the default 50 km of a typed location, optionally in a
// discipline. Same resolver and RPC the results page uses, so the number
// the card promises is the number /search then shows.
export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get("location")?.trim() ?? "";
  const d = req.nextUrl.searchParams.get("d")?.trim() ?? "";
  if (location.length < 2) return NextResponse.json({ count: null });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ count: null });

  const resolved = await resolveLocation(supabase, location);
  if (!resolved) return NextResponse.json({ count: null });

  const disciplineSlugs = d ? [d] : [];
  const disciplines = await getDisciplines(supabase);
  const disciplineIds = disciplines.filter((t) => disciplineSlugs.includes(t.slug)).map((t) => t.id);

  const real = await searchCoaches(supabase, {
    disciplineIds,
    lat: resolved.lat,
    long: resolved.long,
    radiusKm: 50,
  });
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const mock = searchMockCoaches({ disciplineSlugs, lat: resolved.lat, long: resolved.long, radiusKm: 50 });

  return NextResponse.json({ count: real.length + mock.length, town: resolved.suburb, state: resolved.state });
}
