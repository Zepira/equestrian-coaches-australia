import type { SupabaseClient } from "@supabase/supabase-js";
import { disciplines as staticDisciplines } from "@/lib/disciplines";

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
