import type { SupabaseClient } from "@supabase/supabase-js";
import type { TermKind } from "./terms";

export type CoachSearchResult = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  suburb: string;
  state: string;
  distanceKm: number | null;
  disciplineNames: string[];
  skillNames: string[];
  attributeNames: string[];
  photoUrl: string | null;
};

export type SearchFilters = {
  disciplineIds?: string[];
  skillIds?: string[];
  attributeIds?: string[];
  lat?: number | null;
  long?: number | null;
  radiusKm?: number;
};

// Runs the nearby_coaches() RPC (phase 4, rewritten for multi-select in
// phase 9 — OR within a kind, AND across kinds) then hydrates the thin
// result rows with what CoachCard needs to render — name, disciplines, a
// thumbnail — in a second batched query, preserving the RPC's
// distance/match-count ordering.
export async function searchCoaches(
  supabase: SupabaseClient,
  { disciplineIds, skillIds, attributeIds, lat, long, radiusKm = 50 }: SearchFilters
): Promise<CoachSearchResult[]> {
  const { data: matches, error } = await supabase.rpc("nearby_coaches", {
    p_discipline_ids: disciplineIds?.length ? disciplineIds : null,
    p_skill_ids: skillIds?.length ? skillIds : null,
    p_attribute_ids: attributeIds?.length ? attributeIds : null,
    p_lat: lat ?? null,
    p_long: long ?? null,
    p_radius_km: radiusKm,
  });
  if (error || !matches || matches.length === 0) return [];

  const ids = matches.map((m: { id: string }) => m.id);

  const [{ data: profileRows }, { data: disciplineRows }, { data: photoRows }] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", ids),
    supabase
      .from("coach_terms")
      .select("coach_id, terms(name, kind)")
      .in("coach_id", ids),
    supabase
      .from("coach_photos")
      .select("coach_id, storage_path")
      .in("coach_id", ids)
      .order("sort_order"),
  ]);

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.name as string]));
  const namesByKindAndCoach: Record<TermKind, Map<string, string[]>> = {
    discipline: new Map(),
    skill: new Map(),
    attribute: new Map(),
  };
  for (const row of disciplineRows ?? []) {
    const term = (row as unknown as { terms: { name: string; kind: TermKind } | null }).terms;
    if (!term) continue;
    const byCoach = namesByKindAndCoach[term.kind];
    const list = byCoach.get(row.coach_id) ?? [];
    list.push(term.name);
    byCoach.set(row.coach_id, list);
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
    disciplineNames: namesByKindAndCoach.discipline.get(m.id) ?? [],
    skillNames: namesByKindAndCoach.skill.get(m.id) ?? [],
    attributeNames: namesByKindAndCoach.attribute.get(m.id) ?? [],
    photoUrl: photoById.get(m.id) ?? null,
  }));
}
