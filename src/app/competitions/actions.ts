"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceSupabase } from "@/lib/supabase/service";
import { ensureContact, recordConsent, consentStatus } from "@/lib/audience";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent } from "@/lib/cms/read";
import { absoluteUrl } from "@/lib/site-url";
import { deviceHash } from "@/lib/reviews";
import { phase, type Competition } from "@/lib/competitions";

export type EntryResult = { ok: boolean; message: string; sent?: boolean };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

/**
 * An entry (M10). It only counts once the email is confirmed, which also
 * turns the separate news box into consent. One per person per competition.
 */
export async function enterCompetition(_prev: EntryResult, fd: FormData): Promise<EntryResult> {
  if (String(fd.get("website") ?? "")) return { ok: true, message: "", sent: true };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "Competitions aren't connected yet." };
  const { data: c } = await service.from("competitions").select("*").eq("id", String(fd.get("competition_id") ?? "")).maybeSingle();
  if (!c || phase(c as Competition) !== "open") return { ok: false, message: "This competition isn't open for entries." };
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const answer = String(fd.get("answer") ?? "").trim().replace(/\r\n/g, "\n");
  const age = String(fd.get("age") ?? "");
  const parent = String(fd.get("parent_name") ?? "").trim();
  const state = String(fd.get("state") ?? "").toUpperCase();
  if (!name || name.length > 80) return { ok: false, message: "Add your name." };
  if (!EMAIL.test(email)) return { ok: false, message: "That email address doesn't look right." };
  if (!answer) return { ok: false, message: "Answer the question to enter." };
  if (answer.length > 2000) return { ok: false, message: "That's a bit long. Keep it under 2,000 characters." };
  if (age !== "adult" && age !== "parent") return { ok: false, message: "Say whether you're 18 or over, or a parent entering for your child." };
  if (age === "parent" && !parent) return { ok: false, message: "Add the parent or guardian's name." };

  const h = await headers();
  const device = deviceHash(h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "", h.get("user-agent") ?? "");
  const { count: today } = await service.from("competition_entries").select("id", { count: "exact", head: true }).eq("device_hash", device).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((today ?? 0) >= 10) return { ok: false, message: "That's a lot of entries from one place today. Try again tomorrow." };
  const { count: sameDevice } = await service.from("competition_entries").select("id", { count: "exact", head: true }).eq("competition_id", c.id).eq("device_hash", device);
  const wordingId = String(fd.get("news_wording") ?? "");
  const { data: entry, error } = await service
    .from("competition_entries")
    .insert({
      competition_id: c.id,
      name,
      email,
      state: STATES.includes(state) ? state : null,
      answer,
      age_ok: true,
      parent_name: age === "parent" ? parent.slice(0, 80) : null,
      wants_news: fd.get("news") === "on",
      news_wording_id: fd.get("news") === "on" && /^[0-9a-f-]{36}$/.test(wordingId) ? wordingId : null,
      device_hash: device,
      flags: (sameDevice ?? 0) > 0 ? ["same_device"] : [],
    })
    .select("confirm_token")
    .single();
  if (error || !entry) {
    if (error?.code === "23505") return { ok: false, message: "You've already entered this one. It's one entry each." };
    console.error("enterCompetition", error);
    return { ok: false, message: "Something went wrong saving that. Please try again shortly." };
  }
  const copy = await getContent("email.competition_confirm");
  const vars = { competition: c.title as string, confirm_url: absoluteUrl(`/competitions/confirm?t=${entry.confirm_token}`) };
  await sendEmail({ to: email, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  return { ok: true, message: "", sent: true };
}

/** The button on /competitions/confirm (a button, because mail scanners open links). */
export async function confirmEntry(fd: FormData) {
  const t = String(fd.get("t") ?? "");
  const service = createServiceSupabase();
  if (!service || !/^[a-f0-9]{32,80}$/.test(t)) redirect("/competitions/confirm?done=unknown");
  const { data: e } = await service!.from("competition_entries").select("id, email, confirmed_at, wants_news, news_wording_id, competitions(slug, title, closes_at, status, opens_at)").eq("confirm_token", t).maybeSingle();
  if (!e) redirect("/competitions/confirm?done=unknown");
  const comp = (e as unknown as { competitions: Competition }).competitions;
  if (!e!.confirmed_at) {
    // Confirming after the close doesn't count: the entry had to be complete in time.
    if (phase(comp) !== "open") redirect(`/competitions/confirm?done=late&c=${comp.slug}`);
    const contact = await ensureContact(service!, e!.email as string);
    await service!.from("competition_entries").update({ confirmed_at: new Date().toISOString(), contact_id: contact.id }).eq("id", e!.id);
    if (e!.wants_news && !(await consentStatus(service!, contact.id)).rider_news) {
      await recordConsent(service!, { contactId: contact.id, purpose: "rider_news", action: "grant", type: "express", wordingId: (e!.news_wording_id as string | null) ?? null, source: `competition:${comp.slug}` });
    }
  }
  redirect(`/competitions/confirm?done=in&c=${comp.slug}`);
}
