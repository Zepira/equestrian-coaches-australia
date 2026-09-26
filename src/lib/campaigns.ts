import type { createServiceSupabase } from "@/lib/supabase/service";
import { canSend, type Purpose } from "@/lib/audience";
import { sendEmailWithId } from "@/lib/email";
import { fillVariables, getProfessions } from "@/lib/cms/read";
import { absoluteUrl } from "@/lib/site-url";
import { eventPath, profilePath } from "@/lib/page-paths";

/**
 * Campaigns (The Marketing Engine M8): one-off emails to a saved audience.
 * An audience is dropdown choices (AudienceFilter), never SQL; the database
 * function audience_members() applies them and says who can be sent to
 * (consent for the purpose, not on the do-not-email list). Every send is
 * checked again with canSend() and carries the commercial footer.
 *
 * Emails are plain text like every other email here, so opens can't be
 * counted. Clicks can: every link goes through /api/c/[token], which logs
 * the click and adds the campaign's utm tags, so sign-ups trace back.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;

export type AudienceFilter = {
  who: "riders" | "providers";
  door?: string;
  profession_id?: string;
  place?: string;
  lat?: number;
  long?: number;
  km?: number;
  tier?: string;
  cohort?: string;
  source?: string;
  joined_from?: string;
  joined_to?: string;
  clicked_days?: number;
};

export type Section =
  | { type: "text"; body: string }
  | { type: "button"; label: string; url: string }
  | { type: "events" }
  | { type: "providers" }
  | { type: "guide"; guide_id: string };

export const SECTION_TYPES: Record<Section["type"], string> = {
  text: "Text",
  button: "A link",
  events: "Events near the reader",
  providers: "New professionals near the reader",
  guide: "A guide",
};

export type Member = { contact_id: string; email: string; name: string | null; profile_id: string | null; provider_id: string | null; lat: number | null; long: number | null; sendable: boolean };

export const purposeOf = (f: AudienceFilter): Purpose => (f.who === "providers" ? "provider_news" : "rider_news");

/** Everyone the filter matches, each marked sendable or not. */
export async function audienceMembers(service: Service, f: AudienceFilter): Promise<Member[]> {
  const { data, error } = await service.rpc("audience_members", { f });
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function audienceCount(service: Service, f: AudienceFilter) {
  const members = await audienceMembers(service, f);
  return { matched: members.length, sendable: members.filter((m) => m.sendable).length };
}

/** A filter from the audience form: every field checked against its own list, so nothing else gets in. */
export function parseFilter(fd: FormData | URLSearchParams): AudienceFilter {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const f: AudienceFilter = { who: get("who") === "providers" ? "providers" : "riders" };
  if (["coaches", "horse_care"].includes(get("door"))) f.door = get("door");
  if (/^[0-9a-f-]{36}$/.test(get("profession_id"))) f.profession_id = get("profession_id");
  if (get("place")) f.place = get("place").slice(0, 60);
  const km = Number(get("km"));
  if (f.place) f.km = [10, 25, 50, 100, 250].includes(km) ? km : 50;
  if (f.who === "providers" && ["listed", "spotlight", "clinic"].includes(get("tier"))) f.tier = get("tier");
  if (f.who === "providers" && ["founding", "open"].includes(get("cohort"))) f.cohort = get("cohort");
  if (/^[a-z0-9_-]{1,40}$/i.test(get("source"))) f.source = get("source");
  if (/^\d{4}-\d{2}-\d{2}$/.test(get("joined_from"))) f.joined_from = get("joined_from");
  if (/^\d{4}-\d{2}-\d{2}$/.test(get("joined_to"))) f.joined_to = get("joined_to");
  const days = Number(get("clicked_days"));
  if ([30, 90, 180].includes(days)) f.clicked_days = days;
  return f;
}

/** The filter in words, for lists and the send confirmation. */
export async function describeFilter(f: AudienceFilter): Promise<string> {
  const professions = await getProfessions();
  const parts = [f.who === "providers" ? "Live professionals" : "Riders and horse owners"];
  if (f.door) parts.push(f.door === "coaches" ? "coaching" : "horse care");
  if (f.profession_id) parts.push(professions.find((p) => p.id === f.profession_id)?.name ?? "one profession");
  if (f.place) parts.push(`within ${f.km ?? 50} km of ${f.place}`);
  if (f.tier) parts.push(`on ${f.tier}`);
  if (f.cohort) parts.push(`${f.cohort} members`);
  if (f.source) parts.push(`who came from ${f.source}`);
  if (f.joined_from || f.joined_to) parts.push(`joined ${f.joined_from ?? "any time"} to ${f.joined_to ?? "now"}`);
  if (f.clicked_days) parts.push(`who clicked an email in the last ${f.clicked_days} days`);
  return parts.join(", ");
}

// ── rendering ────────────────────────────────────────────────────────────

/** A link in the email. Through /api/c/ for a real send; with no token (a test or a preview), straight to where it points. */
function linker(token: string, sections: Section[]) {
  return (target: { n: number } | { to: string }) => {
    if (token) return absoluteUrl(`/api/c/${token}?${"n" in target ? `n=${target.n}` : `to=${encodeURIComponent(target.to)}`}`);
    if ("to" in target) return absoluteUrl(target.to);
    const s = sections[target.n];
    return s?.type === "button" ? (s.url.startsWith("/") ? absoluteUrl(s.url) : s.url) : absoluteUrl("/");
  };
}

const KM = 50;
const dist = (aLat: number, aLong: number, bLat: number, bLong: number) => {
  const r = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * r) / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(((bLong - aLong) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

type Campaign = { id: string; slug: string; subject: string; preview: string; sections: Section[] };

/**
 * One reader's email. Sections that depend on where they are (events, new
 * professionals) drop out when there's nothing near them or no place known.
 */
export async function renderCampaign(service: Service, c: Campaign, m: Pick<Member, "name" | "lat" | "long">, token: string): Promise<{ subject: string; text: string }> {
  const vars = { first_name: String(m.name ?? "").trim().split(/\s+/)[0] || "there" };
  const click = linker(token, c.sections);
  const parts: string[] = [];
  if (c.preview.trim()) parts.push(fillVariables(c.preview.trim(), vars));
  const hasPlace = m.lat != null && m.long != null;
  for (const [n, s] of c.sections.entries()) {
    if (s.type === "text" && s.body.trim()) parts.push(fillVariables(s.body.trim(), vars));
    else if (s.type === "button" && s.label && s.url) parts.push(`${s.label}: ${click({ n })}`);
    else if (s.type === "events" && hasPlace) {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await service
        .from("events")
        .select("id, title, start_date, location_text, providers!inner(name, lat, long, status)")
        .gte("start_date", today)
        .lte("start_date", new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10))
        .eq("providers.status", "published")
        .order("start_date")
        .limit(200);
      const near = (data ?? [])
        .map((e) => ({ e, p: (e as unknown as { providers: { name: string; lat: number | null; long: number | null } }).providers }))
        .filter(({ p }) => p.lat != null && p.long != null && dist(m.lat!, m.long!, p.lat, p.long) <= KM)
        .slice(0, 5);
      if (near.length) {
        const when = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long" });
        parts.push(["Coming up near you", ...near.map(({ e, p }) => `${e.title}, ${when(e.start_date as string)}, ${e.location_text ?? ""} (${p.name}): ${click({ to: eventPath(e.id as string) })}`)].join("\n"));
      }
    } else if (s.type === "providers" && hasPlace) {
      const { data } = await service
        .from("providers")
        .select("name, slug, suburb, lat, long, published_at")
        .eq("status", "published")
        .gte("published_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
        .limit(300);
      const near = (data ?? []).filter((p) => p.lat != null && p.long != null && dist(m.lat!, m.long!, p.lat as number, p.long as number) <= KM).slice(0, 5);
      if (near.length) parts.push(["New near you", ...near.map((p) => `${p.name}, ${p.suburb ?? ""}: ${click({ to: profilePath(p.slug as string) })}`)].join("\n"));
    } else if (s.type === "guide") {
      const { data: g } = await service.from("guides").select("title, summary, slug").eq("id", s.guide_id).eq("status", "published").maybeSingle();
      if (g) parts.push(`${g.title}\n${g.summary}\n${click({ to: `/guides/${g.slug}` })}`);
    }
  }
  return { subject: fillVariables(c.subject, vars), text: parts.join("\n\n") };
}

// ── sending ──────────────────────────────────────────────────────────────

/**
 * Moves a campaign along: a scheduled one whose time has come takes its
 * recipient list (only the sendable), then up to `limit` queued sends go,
 * each checked again at the moment it's sent. Called by "Send now" and by
 * the cron; safe to call again, it picks up where it stopped.
 */
export async function advanceCampaign(service: Service, campaignId: string, limit = 200, now = new Date()) {
  const { data: c } = await service.from("campaigns").select("*").eq("id", campaignId).single();
  if (!c) return { sent: 0, left: 0 };
  if (c.status === "scheduled" && c.scheduled_at && new Date(c.scheduled_at) <= now) {
    const { data: audience } = await service.from("audiences").select("filter").eq("id", c.audience_id).maybeSingle();
    const filter = (audience?.filter ?? c.filter) as AudienceFilter | null;
    if (!filter) {
      await service.from("campaigns").update({ status: "cancelled" }).eq("id", campaignId);
      return { sent: 0, left: 0 };
    }
    const members = (await audienceMembers(service, filter)).filter((m) => m.sendable);
    for (let i = 0; i < members.length; i += 500) {
      await service.from("campaign_sends").upsert(
        members.slice(i, i + 500).map((m) => ({ campaign_id: campaignId, contact_id: m.contact_id, email: m.email })),
        { onConflict: "campaign_id,contact_id", ignoreDuplicates: true }
      );
    }
    await service.from("campaigns").update({ status: "sending", started_at: now.toISOString(), filter }).eq("id", campaignId);
    c.status = "sending";
    c.filter = filter;
  }
  if (c.status !== "sending") return { sent: 0, left: 0 };

  const filter = c.filter as AudienceFilter;
  const purpose = purposeOf(filter);
  const { data: queued } = await service.from("campaign_sends").select("contact_id, email, token").eq("campaign_id", campaignId).eq("status", "queued").limit(limit);
  const byContact = new Map((await audienceMembers(service, filter)).map((m) => [m.contact_id, m]));
  let sent = 0;
  for (const q of queued ?? []) {
    const check = await canSend(service, q.email as string, purpose);
    if (!check.ok || !check.token) {
      await service.from("campaign_sends").update({ status: "skipped", skip_reason: check.why ?? "no consent" }).eq("campaign_id", campaignId).eq("contact_id", q.contact_id);
      continue;
    }
    const m = byContact.get(q.contact_id as string) ?? { name: null, lat: null, long: null };
    const mail = await renderCampaign(service, { id: c.id, slug: c.slug, subject: c.subject, preview: c.preview, sections: c.sections as Section[] }, m, q.token as string);
    // campaign: true: a bulk send, reached from the cron too, so the pre-launch switch (CRON_EMAILS_ENABLED) holds it.
    const r = await sendEmailWithId({ to: q.email as string, subject: mail.subject, text: mail.text, campaign: true, commercial: { token: check.token, purpose } });
    await service.from("campaign_sends").update({ status: r.result, resend_id: r.id, sent_at: new Date().toISOString() }).eq("campaign_id", campaignId).eq("contact_id", q.contact_id);
    sent++;
  }
  const { count: left } = await service.from("campaign_sends").select("contact_id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "queued");
  if ((left ?? 0) === 0) await service.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId);
  return { sent, left: left ?? 0 };
}

/** The cron: every campaign that's due or part way through. */
export async function advanceCampaigns(service: Service, now = new Date()) {
  const { data } = await service.from("campaigns").select("id").or(`status.eq.sending,and(status.eq.scheduled,scheduled_at.lte.${now.toISOString()})`);
  let sent = 0;
  for (const c of data ?? []) sent += (await advanceCampaign(service, c.id as string, 500, now)).sent;
  return { campaigns: (data ?? []).length, sent };
}

/** What happened: sends, Resend's delivery events, our clicks, people who stopped emails soon after, and sign-ups that came from its links. */
export async function campaignResults(service: Service, c: { id: string; slug: string; started_at: string | null; filter: AudienceFilter | null }) {
  const [{ data: sends }, { data: events }] = await Promise.all([
    service.from("campaign_sends").select("contact_id, status, skip_reason").eq("campaign_id", c.id),
    service.from("email_events").select("contact_id, type").eq("campaign_id", c.id),
  ]);
  const byStatus = (s: string) => (sends ?? []).filter((x) => x.status === s).length;
  const uniq = (t: string) => new Set((events ?? []).filter((e) => e.type === t).map((e) => e.contact_id)).size;
  let stopped = 0;
  let signups = 0;
  if (c.started_at && c.filter) {
    const ids = (sends ?? []).map((s) => s.contact_id as string);
    const until = new Date(new Date(c.started_at).getTime() + 14 * 86_400_000).toISOString();
    for (let i = 0; i < ids.length; i += 300) {
      const { count } = await service
        .from("consents")
        .select("contact_id", { count: "exact", head: true })
        .in("contact_id", ids.slice(i, i + 300))
        .eq("purpose", purposeOf(c.filter))
        .eq("action", "withdraw")
        .gte("created_at", c.started_at)
        .lte("created_at", until);
      stopped += count ?? 0;
    }
    const { count } = await service.from("contacts").select("id", { count: "exact", head: true }).eq("last_touch->>campaign", c.slug).gte("created_at", c.started_at);
    signups = count ?? 0;
  }
  return {
    recipients: (sends ?? []).length,
    sent: byStatus("sent") + byStatus("logged"),
    queued: byStatus("queued"),
    skipped: byStatus("skipped"),
    failed: byStatus("failed"),
    delivered: uniq("delivered"),
    bounced: uniq("bounced"),
    complained: uniq("complained"),
    clicked: uniq("clicked"),
    stopped,
    signups,
  };
}
