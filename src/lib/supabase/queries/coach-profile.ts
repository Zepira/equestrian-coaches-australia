import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";

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
