import { disciplinePhoto } from "@/lib/mock-coaches";

/**
 * A discipline as the public pages and the admin editor see it — the
 * taxonomy row plus the page content added in 0020_discipline_content.sql.
 * Every content field is optional in practice: the seed rows have only a
 * name and blurb, and the helpers below fill in the rest.
 */
export type DisciplineContent = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  description?: string | null;
  image_path?: string | null;
  image_alt?: string | null;
  image_credit?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  active?: boolean;
  updated_at?: string | null;
  aliases?: string[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Public URL for an uploaded term image, or null when none is set. */
export function termImagePublicUrl(path: string | null | undefined) {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/term-images/${path}`;
}

/**
 * The photo to show for a discipline: the admin's upload when there is one,
 * otherwise the vetted stock set the site launched with (see
 * PHOTO_BY_DISCIPLINE in mock-coaches.ts). `width` only shapes the stock
 * URL — uploads are already resized on the way in.
 */
export function disciplineImage(d: Pick<DisciplineContent, "slug" | "image_path" | "image_alt">, width = 800) {
  const uploaded = termImagePublicUrl(d.image_path);
  return {
    src: uploaded ?? disciplinePhoto(d.slug, width),
    alt: d.image_alt?.trim() || "",
    uploaded: Boolean(uploaded),
  };
}

/** Long copy as paragraphs — blank-line separated in the editor. */
export function descriptionParagraphs(description: string | null | undefined) {
  return (description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** <title> / meta description, admin override first, sensible default after. */
export function disciplineSeo(d: Pick<DisciplineContent, "name" | "blurb" | "seo_title" | "seo_description">) {
  const title = d.seo_title?.trim() || `${d.name} coaches`;
  const description =
    d.seo_description?.trim() || `${d.blurb} Search ${d.name.toLowerCase()} coaches across Australia by location.`;
  return { title, description };
}

// Google shows roughly this much before truncating; the editor shows a
// counter against these rather than enforcing them.
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 155;
