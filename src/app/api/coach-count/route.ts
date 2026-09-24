import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, resolveSearchLocation, searchCoaches } from "@/lib/supabase/queries";
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

  // The location and the discipline list don't depend on each other — one
  // round trip to Supabase instead of two before the search can start.
  const disciplineSlugs = d ? [d] : [];
  const [resolved, disciplines] = await Promise.all([resolveSearchLocation(supabase, location), getDisciplines(supabase)]);
  if (!resolved) return NextResponse.json({ count: null });

  const disciplineIds = disciplines.filter((t) => disciplineSlugs.includes(t.slug)).map((t) => t.id);

  // A state-wide search counts by providers.state; a point counts the
  // default 50 km radius, same as /search's first render.
  const where =
    resolved.kind === "state"
      ? { state: resolved.state.code }
      : { lat: resolved.lat, long: resolved.long, radiusKm: 50 };
  const real = await searchCoaches(supabase, { disciplineIds, ...where });
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const mock = searchMockCoaches({ disciplineSlugs, ...where });

  return NextResponse.json(
    resolved.kind === "state"
      ? { count: real.length + mock.length, town: resolved.state.name, state: resolved.state.code, scope: "state" }
      : { count: real.length + mock.length, town: resolved.suburb, state: resolved.state, scope: "point" }
  );
}
