"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { slugify } from "@/lib/guides";
import { MARKETING_FILES } from "@/lib/competitions";
import { PLACEMENTS, type Placement } from "@/lib/sponsors";

/**
 * Admin → Sponsors (M11). Sold by hand as fixed monthly packages; here a
 * sponsor is recorded and each slot booked with its dates. A slot's link is
 * a tracked /go/ link (kind "sponsor", the one kind allowed to leave the
 * site), so its clicks count in the monthly report.
 */
const go = (path: string, m: string, key = "done") => redirect(`${path}?${key}=${encodeURIComponent(m)}`);
const UUID = /^[0-9a-f-]{36}$/;

function refreshPages() {
  revalidatePath("/", "layout");
}

export async function createSponsor(fd: FormData) {
  const { userId } = await requireAdmin();
  const name = formText(fd, "name", 80);
  if (!name) go("/admin/sponsors", "Give the sponsor a name.", "error");
  const service = createServiceSupabase()!;
  let slug = slugify(name).slice(0, 50) || "sponsor";
  const { count } = await service.from("sponsors").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (count) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const { data } = await service.from("sponsors").insert({ name, slug }).select("id").single();
  void userId;
  redirect(`/admin/sponsors/${data!.id}`);
}

export async function saveSponsor(id: string, fd: FormData) {
  await requireAdmin();
  const website = formText(fd, "website", 200);
  if (website && !/^https:\/\/\S+$/.test(website)) go(`/admin/sponsors/${id}`, "The website starts with https://.", "error");
  await createServiceSupabase()!
    .from("sponsors")
    .update({ name: formText(fd, "name", 80), website, contact_email: formText(fd, "contact_email", 120), notes: formText(fd, "notes", 1000) })
    .eq("id", id);
  go(`/admin/sponsors/${id}`, "Saved.");
}

/** "Bendigo" or "bendigo-vic" to an area; empty means every area. */
async function areaFrom(service: NonNullable<ReturnType<typeof createServiceSupabase>>, text: string): Promise<string | null | false> {
  if (!text) return null;
  const { data } = await service.from("areas").select("id").or(`slug.eq.${slugify(text)},name.ilike.${text.replace(/[%_,()]/g, "")}`).limit(1).maybeSingle();
  return data ? (data.id as string) : false;
}

function slotFields(fd: FormData) {
  const placement = formText(fd, "placement", 20) as Placement;
  const url = formText(fd, "url", 500);
  const starts = formText(fd, "starts_on", 10);
  const ends = formText(fd, "ends_on", 10);
  const target = formText(fd, "target", 40);
  const error =
    !(placement in PLACEMENTS)
      ? "Pick where it shows."
      : !formText(fd, "headline", 90)
        ? "It needs a headline."
        : !/^https:\/\/\S+$/.test(url)
          ? "The link starts with https://."
          : !/^\d{4}-\d{2}-\d{2}$/.test(starts) || !/^\d{4}-\d{2}-\d{2}$/.test(ends) || ends < starts
            ? "Pick the first and last day, the last on or after the first."
            : null;
  return {
    error,
    url,
    row: {
      placement,
      guide_id: placement === "guide" && UUID.test(target) ? target : null,
      profession_id: (placement === "profession" || placement === "area") && UUID.test(target) ? target : null,
      area_id: null as string | null,
      headline: formText(fd, "headline", 90),
      body: formText(fd, "body", 300),
      link_label: formText(fd, "link_label", 40) || "Find out more",
      starts_on: starts,
      ends_on: ends,
    },
  };
}

export async function createSlot(sponsorId: string, fd: FormData) {
  const { userId } = await requireAdmin();
  const path = `/admin/sponsors/${sponsorId}`;
  const service = createServiceSupabase()!;
  const { data: sponsor } = await service.from("sponsors").select("slug, name").eq("id", sponsorId).single();
  const f = slotFields(fd);
  if (f.error) go(path, f.error, "error");
  if (f.row.placement === "area") {
    const area = await areaFrom(service, formText(fd, "area", 80));
    if (area === false) go(path, "We couldn't find that place. Try its name, like Bendigo, or bendigo-vic.", "error");
    f.row.area_id = area || null;
  }
  const { data: link, error: linkError } = await service
    .from("links")
    .insert({
      slug: `sp-${sponsor!.slug}-${randomBytes(2).toString("hex")}`.slice(0, 60),
      label: `${sponsor!.name}: ${PLACEMENTS[f.row.placement]}`,
      destination: f.url,
      utm_source: "equineprofessionals",
      utm_medium: "sponsor",
      utm_campaign: `${sponsor!.slug}-${f.row.placement}`,
      kind: "sponsor",
      created_by: userId,
    })
    .select("id")
    .single();
  if (linkError) go(path, linkError.message, "error");
  const { error } = await service.from("sponsor_slots").insert({ ...f.row, sponsor_id: sponsorId, link_id: link!.id });
  if (error) go(path, error.message, "error");
  refreshPages();
  go(path, "Slot booked.");
}

export async function updateSlot(sponsorId: string, slotId: string, fd: FormData) {
  await requireAdmin();
  const path = `/admin/sponsors/${sponsorId}`;
  const service = createServiceSupabase()!;
  const f = slotFields(fd);
  if (f.error) go(path, f.error, "error");
  if (f.row.placement === "area") {
    const area = await areaFrom(service, formText(fd, "area", 80));
    if (area === false) go(path, "We couldn't find that place. Try its name, like Bendigo, or bendigo-vic.", "error");
    f.row.area_id = area || null;
  }
  const { data: slot } = await service.from("sponsor_slots").update({ ...f.row, active: fd.get("active") === "on" }).eq("id", slotId).eq("sponsor_id", sponsorId).select("link_id").single();
  if (slot?.link_id) await service.from("links").update({ destination: f.url }).eq("id", slot.link_id);
  refreshPages();
  go(path, "Saved.");
}

export async function uploadSlotImage(sponsorId: string, slotId: string, fd: FormData) {
  await requireAdmin();
  const file = fd.get("image") as File | null;
  if (!file || !file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const service = createServiceSupabase()!;
  const { data: slot } = await service.from("sponsor_slots").select("image_path").eq("id", slotId).single();
  const path = `sponsors/${sponsorId}/${slotId}-${Date.now()}.${(file.name.split(".").pop() ?? "jpg").toLowerCase()}`;
  const { error } = await service.storage.from(MARKETING_FILES).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;
  await service.from("sponsor_slots").update({ image_path: path }).eq("id", slotId);
  if (slot?.image_path) await service.storage.from(MARKETING_FILES).remove([slot.image_path]);
  refreshPages();
  revalidatePath(`/admin/sponsors/${sponsorId}`);
}

export async function removeSlotImage(sponsorId: string, slotId: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: slot } = await service.from("sponsor_slots").select("image_path").eq("id", slotId).single();
  if (!slot?.image_path) return;
  await service.from("sponsor_slots").update({ image_path: null }).eq("id", slotId);
  await service.storage.from(MARKETING_FILES).remove([slot.image_path]);
  refreshPages();
  revalidatePath(`/admin/sponsors/${sponsorId}`);
}
