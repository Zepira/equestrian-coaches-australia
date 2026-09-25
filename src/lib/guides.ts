import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDER_PHOTOS } from "@/lib/supabase/queries";

/**
 * Guides (The Marketing Engine M9): articles written in admin, public at
 * /guides/[slug] once published. Files (hero photos, the optional
 * download) live in the public guide-files bucket under guides/<id>/.
 */
export const GUIDE_FILES = "guide-files";

export type Guide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  hero_path: string | null;
  hero_alt: string;
  hero_credit: string;
  profession_id: string | null;
  area_id: string | null;
  author_name: string;
  coauthor_provider_id: string | null;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  download_path: string | null;
  download_title: string;
  created_at: string;
  updated_at: string;
};

export const fileUrl = (supabase: SupabaseClient, path: string) => supabase.storage.from(GUIDE_FILES).getPublicUrl(path).data.publicUrl;

export async function publishedGuides(supabase: SupabaseClient): Promise<Guide[]> {
  const { data } = await supabase.from("guides").select("*").eq("status", "published").order("published_at", { ascending: false });
  return (data ?? []) as Guide[];
}

/** A guide by its address; drafts only when asked (the admin preview). */
export async function guideBySlug(supabase: SupabaseClient, slug: string, includeDrafts = false): Promise<Guide | null> {
  let q = supabase.from("guides").select("*").eq("slug", slug);
  if (!includeDrafts) q = q.eq("status", "published");
  const { data } = await q.maybeSingle();
  return (data as Guide | null) ?? null;
}

/** The professional who wrote it with us, as their profile shows them. */
export async function coauthor(supabase: SupabaseClient, providerId: string | null) {
  if (!providerId) return null;
  const { data: p } = await supabase.from("providers").select("name, slug, headline, status").eq("id", providerId).maybeSingle();
  if (!p || p.status !== "published") return null;
  const { data: photo } = await supabase.from("provider_photos").select("storage_path").eq("provider_id", providerId).order("sort_order").limit(1).maybeSingle();
  return {
    name: p.name as string,
    slug: p.slug as string,
    headline: (p.headline as string | null) ?? "",
    photoUrl: photo ? supabase.storage.from(PROVIDER_PHOTOS).getPublicUrl(photo.storage_path as string).data.publicUrl : null,
  };
}

/** "yyyy-mm-dd" slugs from a title. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
