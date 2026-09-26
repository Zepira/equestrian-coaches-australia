"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { computeAwards } from "@/lib/awards";

/**
 * Admin → Awards (stage F). Publishing works the result out again at that
 * moment and saves it as it stands, so what goes up is exactly the rules'
 * answer. Taking a year down removes it from the site and profiles.
 */
const go = (year: number, m: string, key = "done") => redirect(`/admin/awards?year=${year}&${key}=${encodeURIComponent(m)}`);

export async function publishAwards(year: number) {
  await requireAdmin();
  if (!Number.isInteger(year) || year < 2026 || year > new Date().getFullYear()) go(new Date().getFullYear() - 1, "Pick a year that has happened.", "error");
  if (year === new Date().getFullYear()) go(year, "This year isn't over yet.", "error");
  const service = createServiceSupabase()!;
  const results = await computeAwards(service, year);
  if (!results.length) go(year, "Nobody met the rules for that year.", "error");
  await service.from("awards").delete().eq("year", year);
  const now = new Date().toISOString();
  const { error } = await service.from("awards").insert(results.map((r) => ({ year, profession_id: r.profession_id, state: r.state, provider_id: r.provider_id, score: r.score, reviews: r.reviews, average: r.average, saves: r.saves, published_at: now })));
  if (error) go(year, error.message, "error");
  revalidatePath("/riders-choice");
  revalidatePath("/profile/[slug]", "page");
  go(year, `Published ${results.length} ${results.length === 1 ? "winner" : "winners"} for ${year}.`);
}

export async function unpublishAwards(year: number) {
  await requireAdmin();
  await createServiceSupabase()!.from("awards").delete().eq("year", year);
  revalidatePath("/riders-choice");
  revalidatePath("/profile/[slug]", "page");
  go(year, `${year} taken down.`);
}
