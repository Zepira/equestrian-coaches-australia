"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { resolveLocation } from "@/lib/supabase/queries";
import { consentStatus, ensureContact, recordConsent } from "@/lib/audience";
import { fillVariables, getContent } from "@/lib/cms/read";
import { sendEmail } from "@/lib/email";
import { isEmail } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { titleCase } from "@/lib/text";
import { FIRST_TOUCH, LAST_TOUCH, parseTouch } from "@/lib/touch";

/**
 * The subscribe card's actions (The Marketing Engine M3): "Tell me when a
 * new farrier starts near Kyneton" from anywhere on the site.
 *
 * Signed in: the alert is made straight away. Not signed in: the request
 * waits in pending_alerts and we email a link; nothing else is sent until
 * they press confirm, which proves the address is theirs. Confirming makes
 * a rider account with the alert, and records consent under the words the
 * card showed, with where and when.
 */
export type SubscribeResult = { ok: boolean; message: string } | null;

type AlertFields = {
  suburb: string;
  postcode: string;
  lat: number | null;
  long: number | null;
  /** A follow alert: one professional's events, no place (M4). */
  provider_id?: string | null;
  radius_km: number;
  door: string | null;
  profession_ids: string[];
  term_ids: string[];
  wants_events: boolean;
  wants_new_providers: boolean;
};

const UUID = /^[0-9a-f-]{36}$/;
const ip = async () => {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
};

async function alertFrom(fd: FormData): Promise<{ alert: AlertFields; place: string } | { error: string }> {
  const service = createServiceSupabase();
  if (!service) return { error: "Alerts aren't connected yet." };
  const place = String(fd.get("place") ?? "").trim();
  const resolved = place ? await resolveLocation(service, place) : null;
  if (!resolved) return { error: place ? `We couldn't find "${place}". Try a suburb and state, or a postcode.` : "Where should we look? Add a suburb or postcode." };
  const professionId = String(fd.get("profession_id") ?? "");
  const termId = String(fd.get("term_id") ?? "");
  const door = String(fd.get("door") ?? "");
  return {
    place: `${titleCase(resolved.suburb)} ${resolved.state}`,
    alert: {
      suburb: titleCase(resolved.suburb),
      postcode: resolved.postcode,
      lat: resolved.lat,
      long: resolved.long,
      radius_km: 50,
      door: door === "coaches" || door === "horse_care" ? door : null,
      profession_ids: UUID.test(professionId) ? [professionId] : [],
      term_ids: UUID.test(termId) ? [termId] : [],
      wants_events: true,
      wants_new_providers: true,
    },
  };
}

/** "Get my clinic dates by email": one published professional's events, anywhere (M4). */
async function followFrom(providerId: string): Promise<{ alert: AlertFields; place: string } | { error: string }> {
  const service = createServiceSupabase();
  if (!service) return { error: "Alerts aren't connected yet." };
  const { data: p } = await service.from("providers").select("id, name").eq("id", providerId).eq("status", "published").maybeSingle();
  if (!p) return { error: "That profile isn't taking followers right now." };
  return {
    place: p.name as string,
    alert: { suburb: "", postcode: "", lat: null, long: null, radius_km: 50, door: null, profession_ids: [], term_ids: [], wants_events: true, wants_new_providers: false, provider_id: p.id as string },
  };
}

async function makeAlert(riderId: string, a: AlertFields, source: string) {
  const service = createServiceSupabase()!;
  const { lat, long, ...rest } = a;
  const { error } = await service
    .from("rider_alerts")
    .insert({
      rider_id: riderId,
      ...rest,
      location: lat != null && long != null ? `SRID=4326;POINT(${long} ${lat})` : null,
      consent_source: source.slice(0, 40),
      consented_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function subscribeToAlerts(_prev: SubscribeResult, fd: FormData): Promise<SubscribeResult> {
  // A field people can't see: anything that fills it in is a bot.
  if (String(fd.get("website") ?? "")) return { ok: true, message: "Check your inbox." };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "Alerts aren't connected yet." };
  const built = UUID.test(String(fd.get("provider_id") ?? "")) ? await followFrom(String(fd.get("provider_id"))) : await alertFrom(fd);
  if ("error" in built) return { ok: false, message: built.error };
  const source = String(fd.get("source") ?? "card").slice(0, 40);
  const alertsWording = String(fd.get("alerts_wording") ?? "");
  const newsWording = fd.get("news") === "on" ? String(fd.get("news_wording") ?? "") : "";
  const what = String(fd.get("what") ?? "someone new starts").slice(0, 80);

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (user?.email) {
    await makeAlert(user.id, built.alert, `card:${source}`);
    const contact = await ensureContact(service, user.email, { profileId: user.id });
    const status = await consentStatus(service, contact.id);
    const from = await ip();
    if (!status.rider_alerts) await recordConsent(service, { contactId: contact.id, purpose: "rider_alerts", action: "grant", type: "express", wordingId: alertsWording || null, source: `card:${source}`, ip: from });
    if (newsWording && !status.rider_news) await recordConsent(service, { contactId: contact.id, purpose: "rider_news", action: "grant", type: "express", wordingId: newsWording, source: `card:${source}`, ip: from });
    return { ok: true, message: built.alert.provider_id ? `Done. We'll email you when ${built.place} lists an event. Change it from your account.` : `Done. We'll email you when ${what} near ${built.place}. Change it from your account.` };
  }

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { ok: false, message: "That email address doesn't look right." };
  // At most three waiting requests per address a day, so the form can't be used to flood someone's inbox.
  const { count } = await service.from("pending_alerts").select("token", { count: "exact", head: true }).eq("email", email).is("confirmed_at", null).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 3) return { ok: true, message: `We've already sent a link to ${email}. Check your inbox, and your spam folder.` };

  const jar = await cookies();
  const { data: pending, error } = await service
    .from("pending_alerts")
    .insert({
      email,
      alert: { ...built.alert, what, place: built.place },
      news: Boolean(newsWording),
      wording_ids: [alertsWording, newsWording].filter((x) => UUID.test(x)),
      source: `card:${source}`,
      ip: await ip(),
      touch: { first: parseTouch(jar.get(FIRST_TOUCH)?.value), last: parseTouch(jar.get(LAST_TOUCH)?.value) },
    })
    .select("token")
    .single();
  if (error || !pending) return { ok: false, message: "Something went wrong. Try again in a minute." };

  const copy = await getContent("email.alert_confirm");
  const vars = built.alert.provider_id
    ? { what: `${built.place} lists a clinic or event`, place: "", confirm_url: absoluteUrl(`/alerts/confirm?t=${pending.token}`) }
    : { what: `${what} near ${built.place}`, place: built.place, confirm_url: absoluteUrl(`/alerts/confirm?t=${pending.token}`) };
  await sendEmail({ to: email, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  return { ok: true, message: `Nearly done. We've emailed ${email} a link: press it to start the alert.` };
}

/** The confirm button on /alerts/confirm. */
export async function confirmAlert(fd: FormData) {
  const token = String(fd.get("t") ?? "");
  const service = createServiceSupabase();
  if (!service || !/^[a-f0-9]{32,80}$/.test(token)) redirect("/alerts/confirm?done=unknown");
  const { data: p } = await service!.from("pending_alerts").select("*").eq("token", token).maybeSingle();
  if (!p || p.confirmed_at || new Date(p.created_at).getTime() < Date.now() - 14 * 86_400_000) redirect("/alerts/confirm?done=unknown");

  const email = String(p!.email);
  const touch = (p!.touch ?? {}) as { first?: unknown; last?: unknown };
  let { data: profile } = await service!.from("profiles").select("id").eq("email", email).maybeSingle();
  let fresh = false;
  if (!profile) {
    // Pressing the link proves the address is theirs, so the account starts confirmed.
    const { data: made, error } = await service!.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: "rider", name: "", touch_first: JSON.stringify(touch.first ?? null), touch_last: JSON.stringify(touch.last ?? null) },
    });
    if (error || !made.user) redirect("/alerts/confirm?done=unknown");
    profile = { id: made.user!.id };
    fresh = true;
  }
  const a = p!.alert as AlertFields & { what?: string; place?: string };
  const { what, place, ...fields } = a;
  void what;
  void place;
  await makeAlert(profile!.id, fields, String(p!.source));
  const contact = await ensureContact(service!, email, { profileId: profile!.id });
  const status = await consentStatus(service!, contact.id);
  const [alertsWording, newsWording] = (p!.wording_ids ?? []) as string[];
  if (!status.rider_alerts) await recordConsent(service!, { contactId: contact.id, purpose: "rider_alerts", action: "grant", type: "express", wordingId: alertsWording ?? null, source: String(p!.source), ip: p!.ip });
  if (p!.news && !status.rider_news) await recordConsent(service!, { contactId: contact.id, purpose: "rider_news", action: "grant", type: "express", wordingId: newsWording ?? null, source: String(p!.source), ip: p!.ip });
  // Someone who asked for this alert has lifted any earlier "stop everything".
  await service!.from("suppressions").delete().eq("email", email).eq("reason", "unsubscribe_all");
  await service!.from("pending_alerts").update({ confirmed_at: new Date().toISOString() }).eq("token", token);
  redirect(`/alerts/confirm?done=${fresh ? "new" : "added"}&email=${encodeURIComponent(email)}`);
}
