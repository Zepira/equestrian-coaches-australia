import type { SupabaseClient } from "@supabase/supabase-js";
import { disciplines as staticDisciplines } from "@/lib/disciplines";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

// Fetches the discipline taxonomy from the DB, falling back to the static
// list in src/lib/disciplines.ts when there's no live Supabase project yet
// (or the table is empty). Keeps every page working before/after phase 2's
// migration is actually run.
export async function getDisciplines(supabase: SupabaseClient | null) {
  if (!supabase) return staticDisciplines.map((d) => ({ id: d.slug, ...d }));

  const { data, error } = await supabase
    .from("disciplines")
    .select("id, slug, name, blurb")
    .order("sort_order");

  if (error || !data || data.length === 0) {
    return staticDisciplines.map((d) => ({ id: d.slug, ...d }));
  }
  return data;
}

export type ResolvedLocation = {
  postcode: string;
  suburb: string;
  state: string;
  lat: number;
  long: number;
};

// Resolves free-text like "Bendigo VIC", "3550" or "Toowoomba" against the
// postcodes table (loaded via supabase/scripts/load-postcodes.mjs). Used by
// both the search bar and the coach profile save action, so search and
// listing use exactly the same notion of "where this is".
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

  let queryBuilder = supabase.from("postcodes").select("postcode, suburb, state, lat, long");

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
      .select("postcode, suburb, state, lat, long")
      .ilike("suburb", `%${suburbGuess}%`);
    if (stateGuess) fallback = fallback.eq("state", stateGuess);
    const result = await fallback.limit(1).maybeSingle();
    data = result.data;
  }

  if (!data) return null;
  return data;
}

export type CoachSearchResult = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  suburb: string;
  state: string;
  distanceKm: number | null;
  disciplineNames: string[];
  photoUrl: string | null;
};

// Runs the nearby_coaches() RPC (phase 4 migration) then hydrates the thin
// result rows with what CoachCard needs to render — name, disciplines, a
// thumbnail — in a second batched query, preserving the RPC's distance
// ordering.
export async function searchCoaches(
  supabase: SupabaseClient,
  {
    disciplineId,
    lat,
    long,
    radiusKm = 50,
  }: { disciplineId?: string | null; lat?: number | null; long?: number | null; radiusKm?: number }
): Promise<CoachSearchResult[]> {
  const { data: matches, error } = await supabase.rpc("nearby_coaches", {
    p_discipline_id: disciplineId ?? null,
    p_lat: lat ?? null,
    p_long: long ?? null,
    p_radius_km: radiusKm,
  });
  if (error || !matches || matches.length === 0) return [];

  const ids = matches.map((m: { id: string }) => m.id);

  const [{ data: profileRows }, { data: disciplineRows }, { data: photoRows }] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", ids),
    supabase
      .from("coach_disciplines")
      .select("coach_id, disciplines(name)")
      .in("coach_id", ids),
    supabase
      .from("coach_photos")
      .select("coach_id, storage_path")
      .in("coach_id", ids)
      .order("sort_order"),
  ]);

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.name as string]));
  const disciplinesById = new Map<string, string[]>();
  for (const row of disciplineRows ?? []) {
    const name = (row as unknown as { disciplines: { name: string } | null }).disciplines?.name;
    if (!name) continue;
    const list = disciplinesById.get(row.coach_id) ?? [];
    list.push(name);
    disciplinesById.set(row.coach_id, list);
  }
  const photoById = new Map<string, string>();
  for (const row of photoRows ?? []) {
    if (!photoById.has(row.coach_id)) {
      photoById.set(
        row.coach_id,
        supabase.storage.from("coach-photos").getPublicUrl(row.storage_path).data.publicUrl
      );
    }
  }

  return matches.map((m: { id: string; slug: string; headline: string; suburb: string; state: string; distance_km: number | null }) => ({
    id: m.id,
    slug: m.slug,
    name: nameById.get(m.id) ?? "Coach",
    headline: m.headline,
    suburb: m.suburb,
    state: m.state,
    distanceKm: m.distance_km,
    disciplineNames: disciplinesById.get(m.id) ?? [],
    photoUrl: photoById.get(m.id) ?? null,
  }));
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Coaches get a coach_profiles row lazily, on their first visit to the
// dashboard, rather than at signup — keeps the signup form generic across
// both roles.
export async function ensureCoachProfile(
  supabase: SupabaseClient,
  userId: string,
  name: string
) {
  const { data: existing } = await supabase
    .from("coach_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  let slug = slugify(name) || "coach";
  const { data: clash } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) slug = `${slug}-${userId.slice(0, 6)}`;

  const { data: created, error } = await supabase
    .from("coach_profiles")
    .insert({ id: userId, slug })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}
