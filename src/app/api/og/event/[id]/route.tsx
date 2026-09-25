import { createPublicSupabase } from "@/lib/supabase/public";
import { parseFormat, shareImage } from "@/lib/share-image";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** An event's share image (M4). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createPublicSupabase();
  const { data: e } = db
    ? await db.from("events").select("title, start_date, location_text, providers(name, status, provider_photos(storage_path, sort_order))").eq("id", id).maybeSingle()
    : { data: null };
  const host = (e as unknown as { providers: { name: string; status: string; provider_photos: { storage_path: string; sort_order: number }[] } | null } | null)?.providers;
  if (!e || !db || host?.status !== "published") return new Response("Not found", { status: 404 });
  const first = [...(host.provider_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return shareImage({
    format: parseFormat(new URL(request.url).searchParams.get("format")),
    eyebrow: longDate(e.start_date),
    title: e.title,
    lines: [e.location_text, `With ${host.name}`].filter(Boolean),
    photo: first ? db.storage.from("provider-photos").getPublicUrl(first.storage_path).data.publicUrl : null,
    footer: "On Equine Professionals Australia",
  });
}
