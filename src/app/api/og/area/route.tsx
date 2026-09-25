import { createPublicSupabase } from "@/lib/supabase/public";
import { getProfession } from "@/lib/cms/read";
import { professionPhoto } from "@/lib/mock-professionals";
import { parseFormat, shareImage } from "@/lib/share-image";

/** An area page's share image: ?p=farriers&a=bendigo-vic (M4). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const profession = await getProfession(url.searchParams.get("p") ?? "");
  const db = createPublicSupabase();
  const { data: area } = db ? await db.from("areas").select("name, state").eq("slug", url.searchParams.get("a") ?? "").maybeSingle() : { data: null };
  if (!profession?.open || !area) return new Response("Not found", { status: 404 });
  return shareImage({
    format: parseFormat(url.searchParams.get("format")),
    eyebrow: `${area.name}, ${area.state}`,
    title: profession.door === "coaches" ? "Riding coaches" : profession.name,
    lines: [`Near ${area.name}`],
    photo: professionPhoto(profession.slug, 900),
    horseCare: profession.door === "horse_care",
    footer: "Equine Professionals Australia",
  });
}
