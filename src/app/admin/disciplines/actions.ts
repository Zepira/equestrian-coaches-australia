"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CMS_TAG } from "@/lib/cms/read";
import { reservedSlugError } from "@/lib/reserved-slugs";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sectionPath, termPath } from "@/lib/page-paths";

/**
 * Admin actions for discipline content (0020_discipline_content.sql).
 * Taxonomy-level changes — the slug (with its 301), activating/deactivating,
 * the pages flag — still live in /admin/terms; this file owns the copy, the
 * photo and the SEO fields that make up the public page.
 */

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

// Every public surface a discipline appears on. The slug route is the one
// that matters most; the rest carry counts, names or photos that change
// with it.
function revalidateDiscipline(slug: string | null, professionSlug = "coaches") {
  revalidatePath("/");
  revalidatePath(sectionPath(professionSlug));
  if (slug) revalidatePath(termPath(professionSlug, slug));
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/disciplines");
  // The header menu and home chips read disciplines through the CMS cache.
  revalidateTag(CMS_TAG, { expire: 0 });
}

// Browsers submit textarea line breaks as CRLF; store LF so the paragraph
// splitter and any later diffing see one convention.
const text = (fd: FormData, key: string, max = 20_000) =>
  String(fd.get(key) ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);

const parentSlug = (row: unknown) => (row as { parent?: { slug: string } | null } | null)?.parent?.slug ?? "coaches";

export type SaveState = { ok: boolean; message: string } | null;

export async function saveDiscipline(termId: string, _prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await requireAdmin();

  const name = text(formData, "name", 80);
  if (!name) return { ok: false, message: "A name is required." };

  const { data: before } = await supabase.from("terms").select("slug, parent:terms!terms_parent_id_fkey(slug)").eq("id", termId).single();

  const { error } = await supabase
    .from("terms")
    .update({
      name,
      blurb: text(formData, "blurb", 300),
      description: text(formData, "description"),
      image_alt: text(formData, "image_alt", 200),
      image_credit: text(formData, "image_credit", 200),
      seo_title: text(formData, "seo_title", 120),
      seo_description: text(formData, "seo_description", 320),
      updated_at: new Date().toISOString(),
    })
    .eq("id", termId);
  if (error) return { ok: false, message: error.message };

  revalidateDiscipline(before?.slug ?? null, parentSlug(before));
  return { ok: true, message: "Saved." };
}

// A new discipline starts as a bare term (name + slug) and lands the admin
// straight in its editor to fill in the rest.
export async function createDiscipline(formData: FormData) {
  const supabase = await requireAdmin();
  const professionId = text(formData, "profession_id", 60);
  const { data: profession } = await supabase.from("terms").select("id, slug").eq("id", professionId).eq("kind", "profession").maybeSingle();
  if (!profession) throw new Error("Pick a profession.");
  const name = text(formData, "name", 80);
  if (!name) throw new Error("A name is required.");
  const slug = slugify(name);
  if (!slug) throw new Error("That name doesn't make a usable URL.");
  const reserved = reservedSlugError("discipline", slug);
  if (reserved) throw new Error(reserved);

  const { data, error } = await supabase
    .from("terms")
    // Disciplines and specialities are one kind; the parent is the profession.
    .insert({ kind: "discipline", parent_id: profession.id, slug, name, generates_pages: true })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23505" ? `/${profession.slug}/${slug} already exists.` : error.message);

  revalidateDiscipline(slug, profession.slug);
  redirect(`/admin/disciplines/${data.id}`);
}

// Images go to the admin-only term-images bucket under the discipline's
// slug; the previous upload is removed so the bucket never accumulates
// orphans. The client resizes to 1600px before this runs.
export async function uploadDisciplineImage(termId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image.");

  const { data: term, error: termError } = await supabase.from("terms").select("slug, image_path, parent:terms!terms_parent_id_fkey(slug)").eq("id", termId).single();
  if (termError) throw termError;

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `discipline/${term.slug}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("term-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("terms").update({ image_path: path, updated_at: new Date().toISOString() }).eq("id", termId);
  if (error) throw error;

  if (term.image_path) await supabase.storage.from("term-images").remove([term.image_path]);
  revalidateDiscipline(term.slug, parentSlug(term));
}

export async function removeDisciplineImage(termId: string) {
  const supabase = await requireAdmin();
  const { data: term, error: termError } = await supabase.from("terms").select("slug, image_path, parent:terms!terms_parent_id_fkey(slug)").eq("id", termId).single();
  if (termError) throw termError;
  if (!term.image_path) return;

  const { error } = await supabase.from("terms").update({ image_path: null, updated_at: new Date().toISOString() }).eq("id", termId);
  if (error) throw error;
  await supabase.storage.from("term-images").remove([term.image_path]);
  revalidateDiscipline(term.slug, parentSlug(term));
}

/**
 * Featured (§10): coaching's featured disciplines are the Coaches menu and
 * the home page chips, in featured order.
 */
export async function setFeatured(termId: string, featured: boolean) {
  const supabase = await requireAdmin();
  const { data: term } = await supabase.from("terms").select("parent_id").eq("id", termId).single();
  const { data: last } = await supabase
    .from("terms")
    .select("featured_order")
    .eq("parent_id", term?.parent_id ?? "")
    .eq("featured", true)
    .order("featured_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("terms")
    .update({ featured, featured_order: featured ? (last?.featured_order ?? 0) + 1 : 0, updated_at: new Date().toISOString() })
    .eq("id", termId);
  if (error) throw error;
  revalidateDiscipline(null);
  revalidatePath("/", "layout");
}

export async function moveFeatured(termId: string, direction: "up" | "down") {
  const supabase = await requireAdmin();
  const { data: term } = await supabase.from("terms").select("parent_id").eq("id", termId).single();
  const { data } = await supabase.from("terms").select("id").eq("parent_id", term?.parent_id ?? "").eq("featured", true).order("featured_order");
  const order = (data ?? []).map((r) => r.id as string);
  const i = order.indexOf(termId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, id] of order.entries()) await supabase.from("terms").update({ featured_order: n + 1 }).eq("id", id);
  revalidateDiscipline(null);
  revalidatePath("/", "layout");
}

// Deactivating hides the discipline everywhere (pages, search, the
// profile editor) but keeps every coach's tag, so switching it back on
// restores them. This is the "remove" an admin normally wants.
export async function setDisciplineActive(termId: string, active: boolean) {
  const supabase = await requireAdmin();
  const { data: term } = await supabase.from("terms").select("slug, parent:terms!terms_parent_id_fkey(slug)").eq("id", termId).single();
  const { error } = await supabase.from("terms").update({ active, updated_at: new Date().toISOString() }).eq("id", termId);
  if (error) throw error;
  revalidateDiscipline(term?.slug ?? null, parentSlug(term));
}

// A real delete is only offered when nothing points at the row — no coach
// has tagged it and no clinic is filed under it. Otherwise the button isn't
// rendered, and this refuses anyway in case it's called directly.
export async function deleteDiscipline(termId: string) {
  const supabase = await requireAdmin();
  const [{ count: coaches }, { count: clinics }, { data: term }] = await Promise.all([
    supabase.from("provider_terms").select("*", { count: "exact", head: true }).eq("term_id", termId),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("term_id", termId),
    supabase.from("terms").select("slug, image_path, parent:terms!terms_parent_id_fkey(slug)").eq("id", termId).single(),
  ]);
  if ((coaches ?? 0) > 0 || (clinics ?? 0) > 0) {
    throw new Error("Coaches or clinics still use this discipline — deactivate it instead.");
  }
  if (term?.image_path) await supabase.storage.from("term-images").remove([term.image_path]);
  const { error } = await supabase.from("terms").delete().eq("id", termId);
  if (error) throw error;
  revalidateDiscipline(term?.slug ?? null, parentSlug(term));
  redirect("/admin/disciplines");
}
