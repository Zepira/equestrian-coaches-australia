import type { SupabaseClient } from "@supabase/supabase-js";
import { disciplines as staticDisciplines } from "@/lib/disciplines";

export type TermKind = "discipline" | "skill" | "attribute";

// Generic reader for the terms table (phase 9 taxonomy — see CLAUDE.md
// "Search & taxonomy build spec"). Falls back to the static discipline
// list when there's no live Supabase project, or for skills/attributes
// when the table is empty (both cases keep pages working rather than
// throwing). Not exported — every caller goes through the
// getDisciplines/getSkills/getAttributes wrappers below.
async function getTerms(supabase: SupabaseClient | null, kind: TermKind) {
  if (!supabase) return kind === "discipline" ? staticDisciplines.map((d) => ({ id: d.slug, ...d })) : [];

  const { data, error } = await supabase
    .from("terms")
    .select("id, slug, name, blurb")
    .eq("kind", kind)
    .eq("active", true)
    .order("sort_order");

  if (error || !data || data.length === 0) {
    return kind === "discipline" ? staticDisciplines.map((d) => ({ id: d.slug, ...d })) : [];
  }
  return data;
}

// Kept as the discipline-specific name since it's used all over the app —
// equivalent to getTerms(supabase, "discipline").
export function getDisciplines(supabase: SupabaseClient | null) {
  return getTerms(supabase, "discipline");
}

export function getSkills(supabase: SupabaseClient | null) {
  return getTerms(supabase, "skill");
}

export function getAttributes(supabase: SupabaseClient | null) {
  return getTerms(supabase, "attribute");
}
