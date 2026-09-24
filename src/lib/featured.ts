import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachSearchResult } from "@/lib/supabase/queries";
import { featuredTiers } from "@/lib/tiers";
import { getFeaturedMinProviders, getFeaturedSlotsPerArea, getPlanCapabilities } from "@/lib/settings";

/**
 * The featured block (CLAUDE.md, "Four things we never sell"): a labelled
 * block above the results, never a place in them. The rules, all counted per
 * profession:
 *
 *  - only on a search around a point (a place), never state-wide or national;
 *  - only where at least `featured_min_providers` real providers of that
 *    profession are near the place: being one of three isn't worth paying for;
 *  - at most `featured_slots_per_area` per profession;
 *  - only providers whose plan includes a featured spot (plan_capabilities),
 *    and never a remote provider on a place search;
 *  - taking turns: the order rotates each day, so no one owns the top spot.
 *
 * Featured providers still appear in the results at their own position.
 */
export async function pickFeatured(
  supabase: SupabaseClient | null,
  results: CoachSearchResult[],
  { point, now = new Date() }: { point: boolean; now?: Date }
): Promise<CoachSearchResult[]> {
  if (!supabase || !point) return [];
  const [min, slots, caps] = await Promise.all([getFeaturedMinProviders(), getFeaturedSlotsPerArea(), getPlanCapabilities()]);
  const tiers = featuredTiers(caps);
  if (slots === 0 || tiers.length === 0) return [];

  const byProfession = new Map<string, CoachSearchResult[]>();
  for (const r of results) {
    if (r.isRemote || !r.professionId) continue;
    byProfession.set(r.professionId, [...(byProfession.get(r.professionId) ?? []), r]);
  }

  const picked: CoachSearchResult[] = [];
  const day = now.toISOString().slice(0, 10);
  for (const group of byProfession.values()) {
    if (group.length < min) continue;
    const { data } = await supabase.rpc("featured_candidates", { p_provider_ids: group.map((r) => r.id), p_tiers: tiers });
    const eligible = new Set((data ?? []) as string[]);
    picked.push(
      ...group
        .filter((r) => eligible.has(r.id))
        .sort((a, b) => turn(a.id, day) - turn(b.id, day))
        .slice(0, slots)
    );
  }
  return picked;
}

/** A stable per-day shuffle key (FNV-1a over id + date). */
function turn(id: string, day: string): number {
  let h = 0x811c9dc5;
  for (const c of id + day) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
