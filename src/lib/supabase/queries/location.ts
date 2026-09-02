import type { SupabaseClient } from "@supabase/supabase-js";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

export type ResolvedLocation = {
  postcode: string;
  suburb: string;
  state: string;
  lat: number;
  long: number;
  area_id: string | null;
};

// Resolves free-text like "Bendigo VIC", "3550" or "Toowoomba" against the
// postcodes table (loaded via supabase/scripts/load-postcodes.mjs). Used by
// both the search bar and the coach profile save action, so search and
// listing use exactly the same notion of "where this is". Also carries
// area_id (0009_areas.sql) so the profile save action can keep
// coach_profiles.area_id current for the indexable_pages register.
export async function resolveLocation(
  supabase: SupabaseClient,
  query: string
): Promise<ResolvedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1]?.toUpperCase();
  const stateGuess = AU_STATES.includes(lastWord) ? lastWord : null;
  const withoutState = stateGuess ? words.slice(0, -1).join(" ") : trimmed;

  const postcodeMatch = withoutState.match(/\b\d{4}\b/);
  const suburbGuess = withoutState.replace(/\b\d{4}\b/, "").trim();

  let queryBuilder = supabase.from("postcodes").select("postcode, suburb, state, lat, long, area_id");

  if (postcodeMatch) {
    queryBuilder = queryBuilder.eq("postcode", postcodeMatch[0]);
  } else if (suburbGuess) {
    queryBuilder = queryBuilder.ilike("suburb", suburbGuess);
  } else {
    return null;
  }
  if (stateGuess) queryBuilder = queryBuilder.eq("state", stateGuess);

  let { data } = await queryBuilder.limit(1).maybeSingle();

  // Fall back to a partial suburb match if the exact one missed.
  if (!data && suburbGuess) {
    let fallback = supabase
      .from("postcodes")
      .select("postcode, suburb, state, lat, long, area_id")
      .ilike("suburb", `%${suburbGuess}%`);
    if (stateGuess) fallback = fallback.eq("state", stateGuess);
    const result = await fallback.limit(1).maybeSingle();
    data = result.data;
  }

  if (!data) return null;
  return data;
}
