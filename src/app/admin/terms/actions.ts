"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CMS_TAG } from "@/lib/cms/read";
import { reservedSlugError } from "@/lib/reserved-slugs";
import { getCoachingId } from "@/lib/supabase/queries";
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

  const slug = slugify(name);
  const reserved = reservedSlugError(kind, slug);
  if (reserved) throw new Error(reserved);

  // This screen edits coaching's vocabulary, so new terms belong to coaching.
  const { error } = await supabase.from("terms").insert({
    kind,
    parent_id: await getCoachingId(supabase),
    slug,
    name,
    generates_pages: kind === "discipline",
  });
  if (error) throw error;

  revalidatePath("/admin/terms");
  revalidateTag(CMS_TAG, { expire: 0 });
}

// Slug is deliberately not editable here — the slug trap: once a term is
// indexable, changing its slug 404s every page under it. Renaming the
// display name is safe and common; changing the URL goes through
// changeTermSlug below instead, a separate deliberate action.
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
  revalidateTag(CMS_TAG, { expire: 0 });
}

// The slug trap's actual escape hatch: renaming the URL a term lives at.
// Writes the *current* slug to term_slug_history before changing it, keyed
// on term_id — that means the redirect middleware always resolves an old
// slug straight to whatever the term's slug is *now*, no matter how many
// times it's been renamed since (src/lib/supabase/middleware.ts).
export async function changeTermSlug(termId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const newSlug = slugify(String(formData.get("slug") ?? ""));
  if (!newSlug) throw new Error("A slug is required.");

  const { data: term, error: fetchError } = await supabase
    .from("terms")
    .select("slug, kind, parent_id")
    .eq("id", termId)
    .single();
  if (fetchError) throw fetchError;
  if (term.slug === newSlug) return;
  const reserved = reservedSlugError(term.kind, newSlug);
  if (reserved) throw new Error(reserved);

  // One row per (kind, parent, old slug). If this exact slug was vacated
  // before (a rename-and-revert), the newest departure wins, so the
  // redirect points at whoever holds the URL's meaning now. Delete then
  // insert: the unique key includes an expression, which upsert can't name.
  let clear = supabase.from("term_slug_history").delete().eq("kind", term.kind).eq("old_slug", term.slug);
  clear = term.parent_id ? clear.eq("parent_id", term.parent_id) : clear.is("parent_id", null);
  await clear;
  const { error: historyError } = await supabase
    .from("term_slug_history")
    .insert({ kind: term.kind, parent_id: term.parent_id, old_slug: term.slug, term_id: termId });
  if (historyError) throw historyError;

  const { error: updateError } = await supabase.from("terms").update({ slug: newSlug }).eq("id", termId);
  if (updateError) throw updateError;

  revalidatePath("/admin/terms");
  revalidateTag(CMS_TAG, { expire: 0 });
}

export async function toggleTermActive(termId: string, active: boolean) {
  const supabase = await requireAdmin();
  // Deactivate rather than delete — a deleted term silently unpicks
  // itself from every coach who chose it.
  const { error } = await supabase.from("terms").update({ active }).eq("id", termId);
  if (error) throw error;

  revalidatePath("/admin/terms");
  revalidateTag(CMS_TAG, { expire: 0 });
}

export async function toggleGeneratesPages(termId: string, generatesPages: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("terms")
    .update({ generates_pages: generatesPages })
    .eq("id", termId);
  if (error) throw error;

  revalidatePath("/admin/terms");
  revalidateTag(CMS_TAG, { expire: 0 });
}
