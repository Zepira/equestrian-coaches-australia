import type { createServiceSupabase } from "@/lib/supabase/service";
import { absoluteUrl } from "@/lib/site-url";
import { MARKETING_FILES } from "@/lib/competitions";

/**
 * Sponsors (The Marketing Engine M11): a brand's slot in the rider
 * newsletter, on a guide, or on a profession or area page. Every slot is
 * labelled "Sponsored" (in code, so no one can edit it away), never sits
 * inside a list of professionals, and is the same for everyone who sees it:
 * no rider data goes into choosing it. Clicks go through /go/, and each
 * showing is counted for the sponsor's monthly report.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;
export type Placement = "newsletter" | "guide" | "profession" | "area";
export const PLACEMENTS: Record<Placement, string> = {
  newsletter: "The rider round-up email",
  guide: "A guide",
  profession: "A profession's page",
  area: "An area page",
};
export const SPONSORED = "Sponsored";

export type Slot = { id: string; headline: string; body: string; image_path: string | null; link_label: string; link_id: string | null; sponsor: { name: string }; link: { slug: string } | null };

/**
 * The slot for this spot today: one aimed at this exact guide, profession or
 * area first, else one for every page of the kind. Null when nothing's booked.
 */
export async function liveSlot(service: Service, placement: Placement, target: { guideId?: string | null; professionId?: string | null; areaId?: string | null } = {}): Promise<Slot | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const { data } = await service
    .from("sponsor_slots")
    .select("id, headline, body, image_path, link_label, link_id, guide_id, profession_id, area_id, created_at, sponsors(name), links(slug)")
    .eq("placement", placement)
    .eq("active", true)
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("created_at");
  const own = placement === "guide" ? "guide_id" : placement === "profession" ? "profession_id" : placement === "area" ? "area_id" : null;
  const want = placement === "guide" ? target.guideId : placement === "profession" ? target.professionId : placement === "area" ? target.areaId : null;
  const rows = (data ?? []) as unknown as (Slot & Record<string, unknown> & { sponsors: { name: string }; links: { slug: string } | null })[];
  const fits = own ? rows.filter((r) => r[own] === null || (want && r[own] === want)) : rows;
  const pick = (own && want ? fits.find((r) => r[own] === want) : undefined) ?? fits.find((r) => !own || r[own] === null) ?? null;
  return pick ? { ...pick, sponsor: pick.sponsors, link: pick.links } : null;
}

export async function countView(service: Service, slotId: string) {
  await service.rpc("count_sponsor_view", { p_slot: slotId });
}

export const slotHref = (slot: Slot) => (slot.link ? absoluteUrl(`/go/${slot.link.slug}`) : null);
export const slotImage = (service: Service, path: string) => service.storage.from(MARKETING_FILES).getPublicUrl(path).data.publicUrl;

/** The newsletter's sponsor block as plain text, counted as a showing; empty when nothing's booked. */
export async function newsletterSponsorText(service: Service): Promise<string> {
  const slot = await liveSlot(service, "newsletter");
  if (!slot) return "";
  await countView(service, slot.id);
  const href = slotHref(slot);
  return [`${SPONSORED}: ${slot.sponsor.name}`, slot.headline, slot.body, href ? `${slot.link_label}: ${href}` : ""].filter(Boolean).join("\n");
}

/** A sponsor's month, per slot: showings (pages and newsletters) and clicks on its link. "2026-10" style months. */
export async function sponsorReport(service: Service, sponsorId: string, month: string) {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const { data: slots } = await service
    .from("sponsor_slots")
    .select("id, placement, headline, starts_on, ends_on, link_id, guides(title), terms(name), areas(name, state)")
    .eq("sponsor_id", sponsorId)
    .order("starts_on");
  const rows = [];
  for (const s of (slots ?? []) as unknown as { id: string; placement: Placement; headline: string; starts_on: string; ends_on: string; link_id: string | null; guides: { title: string } | null; terms: { name: string } | null; areas: { name: string; state: string } | null }[]) {
    const [{ data: views }, { count: clicks }] = await Promise.all([
      service.from("sponsor_impressions").select("views").eq("slot_id", s.id).gte("day", from).lt("day", to),
      s.link_id ? service.from("link_clicks").select("link_id", { count: "exact", head: true }).eq("link_id", s.link_id).gte("day", from).lt("day", to) : Promise.resolve({ count: 0 }),
    ]);
    const where = [PLACEMENTS[s.placement], s.guides?.title, s.terms?.name, s.areas ? `${s.areas.name} ${s.areas.state}` : null].filter(Boolean).join(", ");
    rows.push({ id: s.id, where, headline: s.headline, dates: `${s.starts_on} to ${s.ends_on}`, views: (views ?? []).reduce((n, v) => n + (v.views as number), 0), clicks: clicks ?? 0 });
  }
  return rows;
}
