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
    .order("suburb")
    .limit(30);

  const seen = new Set<string>();
  const suggestions: LocationSuggestion[] = [];
  for (const row of data ?? []) {
    const key = `${row.suburb}|${row.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      label: `${row.suburb} ${row.state} ${row.postcode}`,
      value: `${row.suburb} ${row.state}`,
      suburb: row.suburb,
      state: row.state,
      postcode: row.postcode,
    });
    if (suggestions.length >= 8) break;
  }

  return NextResponse.json({ suggestions });
}
