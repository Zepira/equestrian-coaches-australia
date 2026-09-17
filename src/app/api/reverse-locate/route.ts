import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { titleCase } from "@/lib/text";

/**
 * Nearest postcode row to a lat/long — what "Use my location" needs to turn
 * the browser's coordinates into the "Suburb STATE" text the search runs on.
 * Public, read-only, one KNN query (nearest_postcode(), 0022). Coordinates
 * are rounded to ~1 km before use: the caller never needs better, and it
 * keeps a precise home position out of server logs and the CDN cache key.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const long = Number(req.nextUrl.searchParams.get("long"));
  if (!Number.isFinite(lat) || !Number.isFinite(long) || Math.abs(lat) > 90 || Math.abs(long) > 180) {
    return NextResponse.json({ error: "lat and long are required" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data, error } = await supabase.rpc("nearest_postcode", { p_lat: round(lat), p_long: round(long) });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return NextResponse.json({ error: "no match" }, { status: 404 });

  // Anything more than ~150 km from the nearest Australian postcode isn't
  // in Australia — say so rather than dropping the rider in Broome.
  if (row.distance_km > 150) return NextResponse.json({ error: "outside Australia" }, { status: 404 });

  const suburb = titleCase(row.suburb);
  return NextResponse.json(
    { value: `${suburb} ${row.state}`, suburb, state: row.state, postcode: row.postcode, lat: row.lat, long: row.long, distanceKm: row.distance_km },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } }
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
