import type { SupabaseClient } from "@supabase/supabase-js";
import { STATE_CODES } from "@/lib/au-states";
import type { ResolvedLocation } from "@/lib/supabase/queries";

/**
 * A place someone saves (where a professional is based, where a rider wants
 * alerts) has to be a real suburb, not whatever was typed. The form's
 * suburb field only lets a pick from the list through (PlaceField in
 * src/components/location-autocomplete.tsx); this is the same check on the
 * server, so a typed "Richmond" or a stale "Bendio" can't be saved by
 * posting the form directly.
 *
 * Search is the opposite case and stays forgiving: it uses resolveLocation()
 * in queries.ts, which takes a state name, a partial name or a postcode.
 */

export type PlaceParts = { suburb: string; state: string | null; postcode: string | null };

/** "Bendigo VIC 3550", "Bendigo VIC", "Bendigo 3550", "3550" into parts. */
export function parsePlace(text: string): PlaceParts {
  const words = text.trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
  let state: string | null = null;
  let postcode: string | null = null;
  const rest: string[] = [];
  for (const w of words) {
    const up = w.toUpperCase();
    if (!postcode && /^\d{4}$/.test(w)) postcode = w;
    else if (!state && STATE_CODES.includes(up)) state = up;
    else rest.push(w);
  }
  return { suburb: rest.join(" "), state, postcode };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * The one suburb the text names, or null when it names none or several.
 * "Richmond" alone is several (NSW, QLD, SA, TAS, VIC), so it fails;
 * "Richmond VIC" passes. A postcode alone passes only when one suburb has it.
 */
export async function verifyPlace(supabase: SupabaseClient, text: string): Promise<ResolvedLocation | null> {
  const { suburb, state, postcode } = parsePlace(text);
  if (!suburb && !postcode) return null;

  let q = supabase.from("postcodes").select("postcode, suburb, state, lat, long, area_id");
  if (suburb) q = q.ilike("suburb", escapeLike(suburb));
  if (state) q = q.eq("state", state);
  if (postcode) q = q.eq("postcode", postcode);
  const { data } = await q.limit(50);
  const rows = (data ?? []) as ResolvedLocation[];
  if (rows.length === 0) return null;

  // One suburb can sit under a few postcodes (and the table repeats rows);
  // what has to be single is the suburb and state.
  const places = new Set(rows.map((r) => `${r.suburb.toUpperCase()}|${r.state}`));
  if (places.size !== 1) return null;
  return rows[0];
}

/** What to tell someone whose place didn't verify. */
export function placeProblem(text: string): string {
  const { suburb, state } = parsePlace(text);
  if (suburb && !state) return `There's more than one "${suburb}", or we couldn't find it. Pick your suburb from the list as you type.`;
  return `We couldn't find "${text.trim()}". Pick your suburb from the list as you type.`;
}

/**
 * The area a place names, for admin screens that attach something to an
 * area page. A suburb picked from the list gives its area directly; an area
 * slug ("bendigo-vic") still works for whoever knows them. Empty means none,
 * false means it named nothing.
 */
export async function areaIdForPlace(supabase: SupabaseClient, text: string): Promise<string | null | false> {
  const t = text.trim();
  if (!t) return null;
  const place = await verifyPlace(supabase, t);
  if (place) return place.area_id ?? false;
  if (!/^[a-z0-9-]+$/.test(t)) return false;
  const { data } = await supabase.from("areas").select("id").eq("slug", t).limit(1).maybeSingle();
  return data ? (data.id as string) : false;
}
