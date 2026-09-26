"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { resolveLocation } from "@/lib/supabase/queries";
import { ensureContact } from "@/lib/audience";
import { sendEmail } from "@/lib/email";
import { advanceCampaign, parseFilter, renderCampaign, SECTION_TYPES, type Section } from "@/lib/campaigns";

/**
 * Admin → Campaigns (M8): audiences (saved dropdown filters) and campaigns
 * (subject, first line, a short stack of sections), a test to yourself,
 * scheduling, and sending. change_log keeps the history of both.
 */
const go = (path: string, m: string, key = "done") => redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(m)}`);

// ── audiences ────────────────────────────────────────────────────────────

export async function createAudience(fd: FormData) {
  const { userId } = await requireAdmin();
  const name = formText(fd, "name", 80);
  if (!name) go("/admin/campaigns", "Give the audience a name.", "error");
  const { data } = await createServiceSupabase()!.from("audiences").insert({ name, filter: { who: "riders" }, created_by: userId }).select("id").single();
  redirect(`/admin/campaigns/audiences/${data!.id}`);
}

export async function saveAudience(id: string, fd: FormData) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const path = `/admin/campaigns/audiences/${id}`;
  const name = formText(fd, "name", 80);
  if (!name) go(path, "Give the audience a name.", "error");
  const filter = parseFilter(fd);
  if (filter.place) {
    const where = await resolveLocation(service, filter.place);
    if (!where) go(path, `We couldn't find "${filter.place}". Try a suburb and state, or a postcode.`, "error");
    filter.lat = where!.lat;
    filter.long = where!.long;
  }
  await service.from("audiences").update({ name, filter, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/campaigns");
  go(path, "Saved.");
}

export async function deleteAudience(id: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { count } = await service.from("campaigns").select("id", { count: "exact", head: true }).eq("audience_id", id).in("status", ["draft", "scheduled", "sending"]);
  if (count) go(`/admin/campaigns/audiences/${id}`, "A campaign that hasn't finished uses this audience.", "error");
  await service.from("audiences").delete().eq("id", id);
  revalidatePath("/admin/campaigns");
  go("/admin/campaigns", "Audience deleted.");
}

// ── campaigns ────────────────────────────────────────────────────────────

export async function createCampaign(fd: FormData) {
  const { userId } = await requireAdmin();
  const name = formText(fd, "name", 80);
  if (!name) go("/admin/campaigns", "Give the campaign a name.", "error");
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "campaign";
  const slug = `${base}-${randomBytes(2).toString("hex")}`;
  const { data } = await createServiceSupabase()!.from("campaigns").insert({ name, slug, created_by: userId }).select("id").single();
  redirect(`/admin/campaigns/${data!.id}`);
}

function parseSections(fd: FormData): Section[] | string {
  const rows: { order: number; s: Section }[] = [];
  for (let i = 0; i < 20; i++) {
    const type = String(fd.get(`s_${i}_type`) ?? "");
    if (!type || fd.get(`s_${i}_remove`) === "on") continue;
    const order = Number(fd.get(`s_${i}_order`) ?? i);
    if (type === "text") rows.push({ order, s: { type, body: String(fd.get(`s_${i}_body`) ?? "").replace(/\r\n/g, "\n").slice(0, 4000) } });
    else if (type === "button") {
      const url = String(fd.get(`s_${i}_url`) ?? "").trim();
      if (url && !/^https?:\/\/[^\s]+$/.test(url) && !/^\/[^\s/][^\s]*$|^\/$/.test(url)) return `The link "${url}" needs to start with https:// or with / for a page on this site.`;
      rows.push({ order, s: { type, label: String(fd.get(`s_${i}_label`) ?? "").trim().slice(0, 80), url } });
    } else if (type === "events" || type === "providers" || type === "sponsor") rows.push({ order, s: { type } });
    else if (type === "guide") rows.push({ order, s: { type, guide_id: String(fd.get(`s_${i}_guide`) ?? "") } });
  }
  const add = String(fd.get("add_type") ?? "");
  if (add in SECTION_TYPES) {
    const s: Section = add === "text" ? { type: "text", body: "" } : add === "button" ? { type: "button", label: "", url: "" } : add === "guide" ? { type: "guide", guide_id: "" } : { type: add as "events" | "providers" | "sponsor" };
    rows.push({ order: 999, s });
  }
  return rows.sort((a, b) => a.order - b.order).map((r) => r.s);
}

async function editable(id: string) {
  const service = createServiceSupabase()!;
  const { data: c } = await service.from("campaigns").select("*").eq("id", id).single();
  if (!c) redirect("/admin/campaigns");
  if (!["draft", "scheduled"].includes(c!.status)) go(`/admin/campaigns/${id}`, "It's already gone out, so it can't be changed.", "error");
  return { service, c: c! };
}

export async function saveCampaign(id: string, fd: FormData) {
  await requireAdmin();
  const { service } = await editable(id);
  const sections = parseSections(fd);
  if (typeof sections === "string") go(`/admin/campaigns/${id}`, sections, "error");
  const audience = formText(fd, "audience_id", 40);
  await service
    .from("campaigns")
    .update({
      name: formText(fd, "name", 80) || "Untitled",
      audience_id: /^[0-9a-f-]{36}$/.test(audience) ? audience : null,
      subject: formText(fd, "subject", 150),
      preview: formText(fd, "preview", 300),
      sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(`/admin/campaigns/${id}`);
  go(`/admin/campaigns/${id}`, "Saved.");
}

export async function sendCampaignTest(id: string) {
  const { supabase } = await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: c } = await service.from("campaigns").select("*").eq("id", id).single();
  const { data: auth } = await supabase.auth.getUser();
  const to = auth.user?.email;
  if (!c || !to) go(`/admin/campaigns/${id}`, "Your account has no email address.", "error");
  const { data: me } = await service.from("profiles").select("name").eq("id", auth.user!.id).maybeSingle();
  await ensureContact(service, to!, { profileId: auth.user!.id });
  const mail = await renderCampaign(service, { id: c!.id, slug: c!.slug, subject: c!.subject, preview: c!.preview, sections: c!.sections as Section[] }, { name: me?.name ?? null, lat: null, long: null }, "");
  const result = await sendEmail({ to: to!, subject: `[Test] ${mail.subject}`, text: `${mail.text}\n\n--\n(The footer with the unsubscribe link goes here in the real send.)` });
  go(`/admin/campaigns/${id}`, result === "sent" ? `Test sent to ${to}.` : result === "logged" ? "Email isn't set up yet, so the test went to the server log." : "It didn't send. Try again in a minute.", result === "failed" ? "error" : "done");
}

/** "2026-10-01T09:00" in Melbourne time, as a Date. */
function melbourne(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value])
  );
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (shown - guess));
}

function ready(c: { subject: string; audience_id: string | null; sections: Section[] }): string | null {
  if (!c.audience_id) return "Pick an audience first.";
  if (!c.subject.trim()) return "It needs a subject.";
  if (!c.sections.some((s) => (s.type === "text" && s.body.trim()) || (s.type === "button" && s.label && s.url) || s.type === "guide")) return "It needs some words or a link.";
  return null;
}

export async function scheduleCampaign(id: string, fd: FormData) {
  await requireAdmin();
  const { service, c } = await editable(id);
  const why = ready(c as never);
  if (why) go(`/admin/campaigns/${id}`, why, "error");
  const at = melbourne(formText(fd, "at", 20));
  if (!at || at.getTime() < Date.now() + 5 * 60_000) go(`/admin/campaigns/${id}`, "Pick a time at least five minutes from now.", "error");
  await service.from("campaigns").update({ status: "scheduled", scheduled_at: at!.toISOString() }).eq("id", id);
  revalidatePath("/admin/campaigns");
  go(`/admin/campaigns/${id}`, `Scheduled for ${at!.toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "long", timeStyle: "short" })}. It goes with the next run after that.`);
}

export async function sendCampaignNow(id: string, fd: FormData) {
  await requireAdmin();
  const { service, c } = await editable(id);
  const why = ready(c as never);
  if (why) go(`/admin/campaigns/${id}`, why, "error");
  if (fd.get("confirm") !== "on") go(`/admin/campaigns/${id}`, "Tick the box to say you've checked the test.", "error");
  await service.from("campaigns").update({ status: "scheduled", scheduled_at: new Date().toISOString() }).eq("id", id);
  const r = await advanceCampaign(service, id, 300);
  revalidatePath("/admin/campaigns");
  go(`/admin/campaigns/${id}`, r.left ? `Sent ${r.sent}. The other ${r.left} go with the next run.` : `Sent to ${r.sent}.`);
}

export async function cancelCampaign(id: string) {
  await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: c } = await service.from("campaigns").select("status").eq("id", id).single();
  if (c?.status === "scheduled") await service.from("campaigns").update({ status: "draft", scheduled_at: null }).eq("id", id);
  else if (c?.status === "sending") {
    await service.from("campaign_sends").update({ status: "skipped", skip_reason: "cancelled" }).eq("campaign_id", id).eq("status", "queued");
    await service.from("campaigns").update({ status: "cancelled" }).eq("id", id);
  }
  revalidatePath("/admin/campaigns");
  go(`/admin/campaigns/${id}`, c?.status === "sending" ? "Stopped. Nobody else gets it." : "Back to a draft.");
}
