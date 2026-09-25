"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { GUIDE_FILES, slugify } from "@/lib/guides";

/**
 * Admin → Guides (M9). Files go to the public guide-files bucket under
 * guides/<id>/; the old file goes when a new one replaces it. A published
 * guide's address is fixed, because links and search results point at it.
 */
const go = (path: string, m: string, key = "done") => redirect(`${path}?${key}=${encodeURIComponent(m)}`);
const UUID = /^[0-9a-f-]{36}$/;

function refresh(slug?: string) {
  revalidatePath("/guides");
  if (slug) revalidatePath(`/guides/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/guides");
}

export async function createGuide(fd: FormData) {
  await requireAdmin();
  const title = formText(fd, "title", 120);
  if (!title) go("/admin/guides", "Give it a title.", "error");
  const service = createServiceSupabase()!;
  let slug = slugify(title) || "guide";
  const { count } = await service.from("guides").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (count) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await service.from("guides").insert({ title, slug }).select("id").single();
  if (error) go("/admin/guides", error.message, "error");
  redirect(`/admin/guides/${data!.id}`);
}

export async function saveGuide(id: string, fd: FormData) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const path = `/admin/guides/${id}`;
  const { data: g } = await service.from("guides").select("slug, status").eq("id", id).single();
  if (!g) redirect("/admin/guides");
  const title = formText(fd, "title", 120);
  if (!title) go(path, "It needs a title.", "error");
  let slug = formText(fd, "slug", 80).toLowerCase();
  if (g!.status === "published") slug = g!.slug;
  else if (!/^[a-z0-9-]{2,80}$/.test(slug)) go(path, "The address is lower-case letters, numbers and dashes.", "error");

  const areaText = formText(fd, "area", 80);
  let areaId: string | null = null;
  if (areaText) {
    const { data: area } = await service.from("areas").select("id").or(`slug.eq.${slugify(areaText)},name.ilike.${areaText.replace(/[%_,()]/g, "")}`).limit(1).maybeSingle();
    if (!area) go(path, `We couldn't find the place "${areaText}". Try its name, like Bendigo, or bendigo-vic.`, "error");
    areaId = area!.id as string;
  }
  const professionId = formText(fd, "profession_id", 40);
  const coauthor = formText(fd, "coauthor_provider_id", 40);
  const { error } = await service
    .from("guides")
    .update({
      title,
      slug,
      summary: formText(fd, "summary", 400),
      body: String(fd.get("body") ?? "").replace(/\r\n/g, "\n").slice(0, 60000),
      hero_alt: formText(fd, "hero_alt", 200),
      hero_credit: formText(fd, "hero_credit", 200),
      profession_id: UUID.test(professionId) ? professionId : null,
      area_id: areaId,
      author_name: formText(fd, "author_name", 80),
      coauthor_provider_id: UUID.test(coauthor) ? coauthor : null,
      seo_title: formText(fd, "seo_title", 70),
      seo_description: formText(fd, "seo_description", 170),
      download_title: formText(fd, "download_title", 80),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) go(path, error.code === "23505" ? `/guides/${slug} is taken.` : error.message, "error");

  const terms = fd.getAll("term_id").map(String).filter((t) => UUID.test(t));
  await service.from("guide_terms").delete().eq("guide_id", id);
  if (terms.length) await service.from("guide_terms").insert(terms.map((term_id) => ({ guide_id: id, term_id })));
  refresh(slug);
  if (g!.slug !== slug) refresh(g!.slug);
  go(path, "Saved.");
}

export async function setGuidePublished(id: string, publish: boolean) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, title, body, summary, published_at").eq("id", id).single();
  if (!g) redirect("/admin/guides");
  if (publish && (!g!.body.trim() || !g!.summary.trim())) go(`/admin/guides/${id}`, "It needs a summary and some words before it goes live.", "error");
  await service.from("guides").update({ status: publish ? "published" : "draft", published_at: publish ? g!.published_at ?? new Date().toISOString() : g!.published_at }).eq("id", id);
  refresh(g!.slug);
  go(`/admin/guides/${id}`, publish ? "It's live." : "Back to a draft. Its page is gone until you publish it again.");
}

export async function deleteGuide(id: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, hero_path, download_path").eq("id", id).single();
  const files = [g?.hero_path, g?.download_path].filter((x): x is string => Boolean(x));
  if (files.length) await service.storage.from(GUIDE_FILES).remove(files);
  await service.from("guides").delete().eq("id", id);
  refresh(g?.slug);
  go("/admin/guides", "Deleted.");
}

// ── files ────────────────────────────────────────────────────────────────

export async function uploadGuideHero(id: string, fd: FormData) {
  await requireAdmin();
  const file = fd.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, hero_path").eq("id", id).single();
  const path = `guides/${id}/hero-${Date.now()}.${(file.name.split(".").pop() ?? "jpg").toLowerCase()}`;
  const { error } = await service.storage.from(GUIDE_FILES).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;
  await service.from("guides").update({ hero_path: path }).eq("id", id);
  if (g?.hero_path) await service.storage.from(GUIDE_FILES).remove([g.hero_path]);
  refresh(g?.slug);
  revalidatePath(`/admin/guides/${id}`);
}

export async function removeGuideHero(id: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, hero_path").eq("id", id).single();
  if (!g?.hero_path) return;
  await service.from("guides").update({ hero_path: null }).eq("id", id);
  await service.storage.from(GUIDE_FILES).remove([g.hero_path]);
  refresh(g.slug);
  revalidatePath(`/admin/guides/${id}`);
}

/**
 * A PDF can be bigger than a form may carry, so the browser uploads it
 * straight to storage with a one-time signed address made here.
 */
export async function guideDownloadUploadUrl(id: string, name: string): Promise<{ path: string; token: string }> {
  await requireAdmin();
  const safe = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+/, "").slice(-60) || "file.pdf";
  if (!safe.endsWith(".pdf")) throw new Error("It has to be a PDF.");
  const { data, error } = await createServiceSupabase()!.storage.from(GUIDE_FILES).createSignedUploadUrl(`guides/${id}/${Date.now()}-${safe}`);
  if (error || !data) throw error ?? new Error("Couldn't start the upload.");
  return { path: data.path, token: data.token };
}

export async function setGuideDownload(id: string, path: string) {
  await requireAdmin();
  if (!path.startsWith(`guides/${id}/`) || !path.endsWith(".pdf")) throw new Error("That isn't this guide's file.");
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, download_path").eq("id", id).single();
  await service.from("guides").update({ download_path: path }).eq("id", id);
  if (g?.download_path && g.download_path !== path) await service.storage.from(GUIDE_FILES).remove([g.download_path]);
  refresh(g?.slug);
  revalidatePath(`/admin/guides/${id}`);
}

export async function removeGuideDownload(id: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: g } = await service.from("guides").select("slug, download_path").eq("id", id).single();
  if (!g?.download_path) return;
  await service.from("guides").update({ download_path: null }).eq("id", id);
  await service.storage.from(GUIDE_FILES).remove([g.download_path]);
  refresh(g.slug);
  revalidatePath(`/admin/guides/${id}`);
}
