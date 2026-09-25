import { createPublicSupabase } from "@/lib/supabase/public";
import { getProfessions } from "@/lib/cms/read";
import { professionPhoto } from "@/lib/mock-professionals";
import { parseFormat, shareImage } from "@/lib/share-image";

/** A profile's share image: ?format=og|square|story, ?founding=1 for the founding member ribbon (M4). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const db = createPublicSupabase();
  const { data: p } = db
    ? await db
        .from("providers")
        .select("id, name, suburb, state, cohort, provider_photos(storage_path, sort_order), provider_terms(sort_order, terms(slug, kind))")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle()
    : { data: null };
  if (!p || !db) return new Response("Not found", { status: 404 });
  const row = p as unknown as {
    name: string; suburb: string; state: string; cohort: string;
    provider_photos: { storage_path: string; sort_order: number }[];
    provider_terms: { sort_order: number; terms: { slug: string; kind: string } | null }[];
  };
  const professionSlug = [...row.provider_terms].sort((a, b) => a.sort_order - b.sort_order).find((t) => t.terms?.kind === "profession")?.terms?.slug ?? "coaches";
  const profession = (await getProfessions()).find((x) => x.slug === professionSlug);
  const first = [...row.provider_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  const photo = first ? db.storage.from("provider-photos").getPublicUrl(first.storage_path).data.publicUrl : professionPhoto(professionSlug, 900);
  const singular = profession?.singular ?? "professional";
  return shareImage({
    format: parseFormat(url.searchParams.get("format")),
    eyebrow: singular,
    title: row.name,
    lines: [[row.suburb, row.state].filter(Boolean).join(" ")].filter(Boolean),
    photo,
    horseCare: profession?.door === "horse_care",
    badge: url.searchParams.get("founding") === "1" && row.cohort === "founding" ? "Founding member" : undefined,
  });
}
