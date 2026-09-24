import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { getProfessions } from "@/lib/cms/read";
import { getEventReachKm } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { eventPath, profilePath } from "@/lib/page-paths";
import type { Door } from "@/lib/professions";

/**
 * Every email a rider or horse owner gets (The Site as a CMS §07): an event
 * near them, a new provider near them, and the monthly round-up. Each one
 * carries a one-click unsubscribe that works without logging in and is
 * honoured at once (Spam Act 2003): an alert's own link stops that alert,
 * the monthly email's link stops everything.
 *
 * All of it runs with the service role, after the request that caused it,
 * and logs to notifications_log so nobody hears about the same thing twice.
 */
type Service = SupabaseClient;
type Match = { rider_id: string; email: string; alert_id: string | null; unsubscribe_token: string };

/** The page link for the email body, and the one-click endpoint for the header. */
export function unsubscribeLinks(kind: "alert" | "all", token: string) {
  const q = `${kind === "alert" ? "a" : "r"}=${token}`;
  return { page: absoluteUrl(`/unsubscribe?${q}`), oneClick: absoluteUrl(`/api/unsubscribe?${q}`) };
}

const footer = (page: string) =>
  `\n\nYou're getting this because you set up an alert on Equine Professionals Australia. Change your alerts: ${absoluteUrl("/account")}\nStop this alert: ${page}`;

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function log(service: Service, row: Record<string, unknown>) {
  const { error } = await service.from("notifications_log").insert(row);
  // A duplicate is a rider already told: fine.
  if (error && error.code !== "23505") console.error("notifications_log insert failed", error);
}

/**
 * A new event → riders whose alerts match it and who are within reach: the
 * alert's own radius, or event_reach_km for a Clinic-plan provider (§07.2).
 */
export async function notifyRidersOfEvent(service: Service, eventId: string) {
  const { data: event } = await service
    .from("events")
    .select("title, start_date, location_text, provider_id, providers(name)")
    .eq("id", eventId)
    .single();
  if (!event) return { matched: 0, sent: 0 };
  const { data: sub } = await service.from("subscriptions").select("tier, status").eq("provider_id", event.provider_id).maybeSingle();
  const reach = sub?.tier === "clinic" && ["active", "trialing", "card_saved"].includes(String(sub.status)) ? await getEventReachKm() : null;

  const { data, error } = await service.rpc("riders_for_event", { p_event_id: eventId, p_reach_km: reach });
  if (error) {
    console.error("riders_for_event failed", error);
    return { matched: 0, sent: 0 };
  }
  const host = (event as unknown as { providers: { name: string } | null }).providers?.name;
  let sent = 0;
  for (const m of (data ?? []) as Match[]) {
    const links = unsubscribeLinks("alert", m.unsubscribe_token);
    const result = await sendEmail({
      to: m.email,
      subject: `${event.title}, ${longDate(event.start_date)}`,
      text: `${event.title}\n${longDate(event.start_date)} · ${event.location_text}${host ? `\nRun by ${host}.` : ""}\n\nThe details: ${absoluteUrl(eventPath(eventId))}${footer(links.page)}`,
      unsubscribe: links.oneClick,
    });
    if (result === "failed") continue;
    if (result === "sent") sent++;
    await log(service, { rider_id: m.rider_id, kind: "event", event_id: eventId, alert_id: m.alert_id });
  }
  return { matched: (data ?? []).length, sent };
}

/** A provider just published → riders who asked to hear when someone like them starts nearby. */
export async function notifyRidersOfProvider(service: Service, providerId: string) {
  const { data, error } = await service.rpc("riders_for_provider", { p_provider_id: providerId });
  if (error) {
    console.error("riders_for_provider failed", error);
    return { matched: 0, sent: 0 };
  }
  if (!data?.length) return { matched: 0, sent: 0 };
  const { data: p } = await service
    .from("providers")
    .select("slug, name, headline, suburb, state, provider_terms(sort_order, terms(slug, kind))")
    .eq("id", providerId)
    .single();
  if (!p) return { matched: 0, sent: 0 };
  const professionSlug = ((p as unknown as { provider_terms: { sort_order: number; terms: { slug: string; kind: string } | null }[] }).provider_terms ?? [])
    .filter((r) => r.terms?.kind === "profession")
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.terms?.slug;
  const singular = (await getProfessions()).find((x) => x.slug === professionSlug)?.singular ?? "professional";
  const article = /^[aeiou]/i.test(singular) ? "an" : "a";
  let sent = 0;
  for (const m of data as Match[]) {
    const links = unsubscribeLinks("alert", m.unsubscribe_token);
    const result = await sendEmail({
      to: m.email,
      subject: `New near you: ${p.name}, ${singular}`,
      text: `${p.name} has just listed as ${article} ${singular} in ${p.suburb} ${p.state}.${p.headline ? `\n\n"${p.headline}"` : ""}\n\nTheir profile: ${absoluteUrl(profilePath(p.slug))}${footer(links.page)}`,
      unsubscribe: links.oneClick,
    });
    if (result === "failed") continue;
    if (result === "sent") sent++;
    await log(service, { rider_id: m.rider_id, kind: "new_provider", provider_id: providerId, alert_id: m.alert_id });
  }
  return { matched: data.length, sent };
}

const DOOR_TITLE: Record<Door, string> = { coaches: "COACHES", horse_care: "HORSE CARE" };

/**
 * The monthly email (§07.3): one email from the brand, a section for each
 * door the rider follows, with events in the next five weeks and providers
 * who joined near them in the last month. Nothing to say, nothing sent.
 * Once a month per rider (notifications_log, kind 'monthly').
 */
export async function sendRiderMonthly(service: Service, now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const since = new Date(now.getTime() - 31 * 86_400_000).toISOString();
  const professions = await getProfessions();
  const nameOf = (id: string | null) => professions.find((p) => p.id === id);

  const { data: alertRows } = await service.from("rider_alerts").select("rider_id").is("unsubscribed_at", null);
  const riders = [...new Set((alertRows ?? []).map((r) => r.rider_id as string))];
  let sent = 0;
  let skipped = 0;
  for (const riderId of riders) {
    const { count } = await service
      .from("notifications_log")
      .select("id", { count: "exact", head: true })
      .eq("rider_id", riderId)
      .eq("kind", "monthly")
      .gte("sent_at", monthStart);
    if (count) continue;

    const [{ data: profile }, { data: events }, { data: providers }] = await Promise.all([
      service.from("profiles").select("name, email, email_token").eq("id", riderId).single(),
      service.rpc("events_for_rider", { p_rider_id: riderId, p_within_days: 35 }),
      service.rpc("new_providers_for_rider", { p_rider_id: riderId, p_since: since }),
    ]);
    if (!profile?.email) continue;
    type Ev = { id: string; title: string; start_date: string; location_text: string; provider_name: string; door: Door | null };
    type Pr = { slug: string; name: string; suburb: string; state: string; profession_id: string | null; door: Door | null };
    const sections = (["coaches", "horse_care"] as Door[])
      .map((door) => {
        const evs = ((events ?? []) as Ev[]).filter((e) => (e.door ?? "coaches") === door);
        const prs = ((providers ?? []) as Pr[]).filter((x) => (x.door ?? "coaches") === door);
        if (!evs.length && !prs.length) return "";
        const lines = [DOOR_TITLE[door]];
        if (evs.length) {
          lines.push("Coming up");
          for (const e of evs) lines.push(`- ${longDate(e.start_date)}: ${e.title}, with ${e.provider_name}, ${e.location_text}. ${absoluteUrl(eventPath(e.id))}`);
        }
        if (prs.length) {
          lines.push("New near you");
          for (const x of prs) lines.push(`- ${x.name}, ${nameOf(x.profession_id)?.singular ?? "professional"} in ${x.suburb} ${x.state}. ${absoluteUrl(profilePath(x.slug))}`);
        }
        return lines.join("\n");
      })
      .filter(Boolean);
    if (!sections.length) {
      skipped++;
      continue;
    }
    const links = unsubscribeLinks("all", profile.email_token as string);
    const first = String(profile.name ?? "").split(" ")[0] || "there";
    const result = await sendEmail({
      to: profile.email as string,
      subject: "This month near you",
      text: `Hi ${first},\n\nHere's what's near you this month.\n\n${sections.join("\n\n")}\n\nYou get this once a month because you have alerts set up. Change them: ${absoluteUrl("/account")}\nStop every email from us: ${links.page}`,
      unsubscribe: links.oneClick,
    });
    if (result === "failed") continue;
    if (result === "sent") sent++;
    await log(service, { rider_id: riderId, kind: "monthly" });
  }
  return { riders: riders.length, sent, skipped };
}

/** One-click unsubscribe, honoured at once. An alert token stops that alert; a rider token stops all of them. */
export async function unsubscribe(service: Service, { alert, rider }: { alert?: string; rider?: string }): Promise<"alert" | "all" | "unknown"> {
  const token = /^[a-f0-9]{32,80}$/;
  const now = new Date().toISOString();
  if (alert && token.test(alert)) {
    const { data } = await service.from("rider_alerts").update({ unsubscribed_at: now, updated_at: now }).eq("unsubscribe_token", alert).select("id");
    return data?.length ? "alert" : "unknown";
  }
  if (rider && token.test(rider)) {
    const { data: profile } = await service.from("profiles").select("id").eq("email_token", rider).maybeSingle();
    if (!profile) return "unknown";
    await service.from("rider_alerts").update({ unsubscribed_at: now, updated_at: now }).eq("rider_id", profile.id).is("unsubscribed_at", null);
    return "all";
  }
  return "unknown";
}
