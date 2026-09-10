import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type LocationSuggestion = {
  label: string; // "Bendigo VIC 3550" — shown in the dropdown
  value: string; // "Bendigo VIC" — what actually fills the field / feeds resolveLocation()
  suburb: string;
  state: string;
  postcode: string;
};

// Suburb/postcode autocomplete for the search bar's location field. Reads
// the same `postcodes` table resolveLocation() already resolves free text
// against (public select policy, no auth needed) — this just narrows what
// a rider types before they submit, so a "Bendigo" typo never reaches
// resolveLocation() as "Bendio" in the first place.
// Towns a rider is far more likely to mean than an alphabetical neighbour:
// "Bend" should offer Bendigo before Bend Of Islands. Capitals, the regional
// centres the mock roster uses, and the larger towns; everything else ranks
// by name length (shorter = more likely the whole name was typed).
const MAJOR_TOWNS = new Set(
  [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Hobart", "Darwin", "Canberra",
    "Bendigo", "Ballarat", "Geelong", "Shepparton", "Warrnambool", "Mildura", "Wodonga", "Traralgon",
    "Toowoomba", "Cairns", "Rockhampton", "Gympie", "Townsville", "Mackay", "Bundaberg", "Gold Coast",
    "Tamworth", "Orange", "Wagga Wagga", "Dubbo", "Armidale", "Newcastle", "Wollongong", "Bathurst",
    "Albury", "Goulburn", "Lismore", "Coffs Harbour", "Port Macquarie",
    "Mount Barker", "Mount Gambier", "Murray Bridge", "Port Lincoln", "Whyalla",
    "Bunbury", "Albany", "Kalgoorlie", "Geraldton", "Busselton", "Mandurah",
    "Launceston", "Devonport", "Burnie", "Alice Springs", "Katherine",
  ].map((t) => t.toLowerCase())
);

import { titleCase } from "@/lib/text";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ suggestions: [] });

  const isNumeric = /^\d+$/.test(q);
  const { data } = await supabase
    .from("postcodes")
    .select("suburb, state, postcode")
    .or(isNumeric ? `postcode.ilike.${q}%` : `suburb.ilike.${q}%`)
    .limit(200);

  const seen = new Set<string>();
  const all: LocationSuggestion[] = [];
  for (const row of data ?? []) {
    const suburb = titleCase(row.suburb);
    const key = `${suburb}|${row.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({
      label: `${suburb} ${row.state} ${row.postcode}`,
      value: `${suburb} ${row.state}`,
      suburb,
      state: row.state,
      postcode: row.postcode,
    });
  }
  const rank = (s: LocationSuggestion) =>
    (MAJOR_TOWNS.has(s.suburb.toLowerCase()) ? 0 : 1000) + s.suburb.length;
  all.sort((a, b) => rank(a) - rank(b) || a.suburb.localeCompare(b.suburb));

  return NextResponse.json({ suggestions: all.slice(0, 8) });
}
