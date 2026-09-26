import type { createServiceSupabase } from "@/lib/supabase/service";
import { getRidersChoiceMinReviews } from "@/lib/settings";

/**
 * The riders' choice award (stage F), by the rules published at
 * /riders-choice (the riders_choice.rules block): for each profession in each
 * state, among professionals listed now with at least the minimum number of
 * reviews published during the year, the highest average rating wins; ties
 * go to more reviews, then more saves that year. Plans, payments and
 * testimonials never count. Change these rules and the published ones
 * together.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;

export type AwardResult = { profession_id: string; state: string; provider_id: string; name: string; slug: string; reviews: number; average: number; saves: number; score: number };

export async function computeAwards(service: Service, year: number): Promise<AwardResult[]> {
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;
  const min = await getRidersChoiceMinReviews();
  const [{ data: reviews }, { data: saves }, { data: providers }] = await Promise.all([
    service.from("reviews").select("provider_id, rating").eq("status", "published").gte("published_at", from).lt("published_at", to),
    service.from("favourites").select("provider_id").gte("created_at", from).lt("created_at", to),
    service.from("providers").select("id, name, slug, state, status, provider_terms(sort_order, terms(id, kind))").eq("status", "published"),
  ]);
  const byProvider = new Map<string, number[]>();
  for (const r of reviews ?? []) byProvider.set(r.provider_id as string, [...(byProvider.get(r.provider_id as string) ?? []), r.rating as number]);
  const saveCount = new Map<string, number>();
  for (const s of saves ?? []) saveCount.set(s.provider_id as string, (saveCount.get(s.provider_id as string) ?? 0) + 1);

  const best = new Map<string, AwardResult>();
  for (const p of (providers ?? []) as unknown as { id: string; name: string; slug: string; state: string | null; provider_terms: { sort_order: number; terms: { id: string; kind: string } | null }[] }[]) {
    const ratings = byProvider.get(p.id) ?? [];
    if (ratings.length < min || !p.state) continue;
    const profession = p.provider_terms.filter((t) => t.terms?.kind === "profession").sort((a, b) => a.sort_order - b.sort_order)[0]?.terms?.id;
    if (!profession) continue;
    const average = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
    const candidate: AwardResult = { profession_id: profession, state: p.state.toUpperCase(), provider_id: p.id, name: p.name, slug: p.slug, reviews: ratings.length, average, saves: saveCount.get(p.id) ?? 0, score: average };
    const key = `${profession}|${candidate.state}`;
    const cur = best.get(key);
    const better = !cur || candidate.average > cur.average || (candidate.average === cur.average && (candidate.reviews > cur.reviews || (candidate.reviews === cur.reviews && candidate.saves > cur.saves)));
    if (better) best.set(key, candidate);
  }
  return [...best.values()].sort((a, b) => a.state.localeCompare(b.state) || b.average - a.average);
}
