"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  return supabase;
}

export async function createTerm(formData: FormData) {
  const supabase = await requireAdmin();

  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !["discipline", "skill", "attribute"].includes(kind)) {
    throw new Error("A name and a valid kind are required.");
  }

  const { error } = await supabase.from("terms").insert({
    kind,
    slug: slugify(name),
    name,
    generates_pages: kind === "discipline",
  });
  if (error) throw error;

  revalidatePath("/admin/terms");
}

// Slug is deliberately not editable here — the slug trap: once a term is
// indexable, changing its slug 404s every page under it. Renaming the
// display name is safe and common; changing the URL needs a dedicated,
// deliberate action (not built yet — see CLAUDE.md).
export async function renameTerm(termId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const { error } = await supabase
    .from("terms")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", termId);
  if (error) throw error;

  revalidatePath("/admin/terms");
}

export async function toggleTermActive(termId: string, active: boolean) {
  const supabase = await requireAdmin();
  // Deactivate rather than delete — a deleted term silently unpicks
  // itself from every coach who chose it.
  const { error } = await supabase.from("terms").update({ active }).eq("id", termId);
  if (error) throw error;

  revalidatePath("/admin/terms");
}

export async function toggleGeneratesPages(termId: string, generatesPages: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("terms")
    .update({ generates_pages: generatesPages })
    .eq("id", termId);
  if (error) throw error;

  revalidatePath("/admin/terms");
}
