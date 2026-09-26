import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_EMAIL, publicUrl } from "@/lib/site-url";

/**
 * The audience and its consent record (The Marketing Engine §05, M1).
 *
 * - contacts: one row per email address, whoever it belongs to.
 * - consents: every grant and withdrawal, append-only; a contact's status for
 *   a purpose is their newest row for it.
 * - consent_wordings: the exact words each person agreed to, by version.
 * - suppressions: bounces stop every email; an unsubscribe from everything, a
 *   spam complaint or an admin block stop every commercial one.
 *
 * Every commercial send asks canSend() first. Factual emails (a password
 * reset, an enquiry passed on, a receipt) only skip addresses that bounce.
 * All of this runs with the service role.
 */
type Service = SupabaseClient;

export const PURPOSES = ["rider_alerts", "rider_news", "provider_news", "waitlist", "invite"] as const;
export type Purpose = (typeof PURPOSES)[number];

/** What each purpose covers, in the words the preferences page uses. */
export const PURPOSE_LABELS: Record<Purpose, string> = {
  rider_alerts: "Alerts when something matches what you follow",
  rider_news: "The monthly round-up of events and new people near you",
  provider_news: "Your monthly numbers, and news for professionals",
  waitlist: "News about the site opening",
  invite: "An invitation to list your business",
};

export type Touch = { source: string; medium?: string; campaign?: string; link?: string; at: string };

/** The contact for an email address, made if there isn't one. */
export async function ensureContact(service: Service, email: string, opts: { profileId?: string | null; touch?: { first?: Touch | null; last?: Touch | null } } = {}) {
  const address = email.trim().toLowerCase();
  const { data: existing } = await service.from("contacts").select("id, token, profile_id, first_touch").eq("email", address).maybeSingle();
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (opts.profileId && !existing.profile_id) patch.profile_id = opts.profileId;
    if (opts.touch?.first && !existing.first_touch) patch.first_touch = opts.touch.first;
    if (opts.touch?.last) patch.last_touch = opts.touch.last;
    if (Object.keys(patch).length) await service.from("contacts").update(patch).eq("id", existing.id);
    return { id: existing.id as string, token: existing.token as string };
  }
  const { data, error } = await service
    .from("contacts")
    .insert({ email: address, profile_id: opts.profileId ?? null, first_touch: opts.touch?.first ?? null, last_touch: opts.touch?.last ?? opts.touch?.first ?? null })
    .select("id, token")
    .single();
  if (error) {
    // Two requests at once: the other one made it.
    const { data: again } = await service.from("contacts").select("id, token").eq("email", address).single();
    return { id: again!.id as string, token: again!.token as string };
  }
  return { id: data.id as string, token: data.token as string };
}

/** The newest wording for a purpose: what a form shows, and what its consent row points at. */
export async function currentWording(supabase: SupabaseClient, purpose: Purpose): Promise<{ id: string; body: string; version: number } | null> {
  const { data } = await supabase.from("consent_wordings").select("id, body, version").eq("purpose", purpose).order("version", { ascending: false }).limit(1).maybeSingle();
  return data ? { id: data.id as string, body: data.body as string, version: data.version as number } : null;
}

export async function recordConsent(
  service: Service,
  row: {
    contactId: string;
    purpose: Purpose;
    action: "grant" | "withdraw";
    type?: "express" | "existing_customer" | "published_address";
    wordingId?: string | null;
    source: string;
    method?: string;
    ip?: string | null;
    createdBy?: string | null;
  }
) {
  const { error } = await service.from("consents").insert({
    contact_id: row.contactId,
    purpose: row.purpose,
    action: row.action,
    type: row.action === "grant" ? (row.type ?? "express") : null,
    wording_id: row.wordingId ?? null,
    source: row.source,
    method: row.method ?? null,
    ip: row.ip ?? null,
    created_by: row.createdBy ?? null,
  });
  if (error) throw error;
}

/** A contact's current status per purpose. */
export async function consentStatus(service: Service, contactId: string): Promise<Partial<Record<Purpose, boolean>>> {
  const { data } = await service.from("consents").select("purpose, action, created_at, id").eq("contact_id", contactId).order("created_at", { ascending: false }).order("id", { ascending: false });
  const status: Partial<Record<Purpose, boolean>> = {};
  for (const r of data ?? []) if (!(r.purpose in status)) status[r.purpose as Purpose] = r.action === "grant";
  return status;
}

export async function suppress(service: Service, email: string, reason: "bounce" | "complaint" | "unsubscribe_all" | "admin", detail?: string) {
  await service.from("suppressions").upsert({ email: email.trim().toLowerCase(), reason, detail: detail ?? null }, { onConflict: "email,reason", ignoreDuplicates: true });
}

/**
 * Whether an email can go to this address. `purpose` for a commercial email,
 * "factual" for one that isn't. Returns the contact's token for the footer
 * and one-click header.
 */
export async function canSend(service: Service, email: string, purpose: Purpose | "factual"): Promise<{ ok: boolean; token?: string; why?: string }> {
  const address = email.trim().toLowerCase();
  const { data: blocks } = await service.from("suppressions").select("reason").eq("email", address);
  const reasons = new Set((blocks ?? []).map((b) => b.reason as string));
  if (reasons.has("bounce")) return { ok: false, why: "bounced" };
  if (purpose === "factual") return { ok: true };
  if (reasons.size) return { ok: false, why: [...reasons].join(", ") };
  const { data: contact } = await service.from("contacts").select("id, token").eq("email", address).maybeSingle();
  if (!contact) return { ok: false, why: "no contact" };
  const status = await consentStatus(service, contact.id);
  return status[purpose] ? { ok: true, token: contact.token as string } : { ok: false, why: "no consent" };
}

/** Withdraw every purpose and add the address to the unsubscribe list. */
export async function stopEverything(service: Service, contact: { id: string; email: string }, method: string, source: string, createdBy?: string | null) {
  const status = await consentStatus(service, contact.id);
  for (const purpose of PURPOSES) if (status[purpose]) await recordConsent(service, { contactId: contact.id, purpose, action: "withdraw", source, method, createdBy });
  await suppress(service, contact.email, "unsubscribe_all", method);
}

// Both on the public host, for the same reason as unsubscribeLinks: the
// person reading the email cannot get past the password on any other one.
export const preferencesUrl = (token: string) => publicUrl(`/email-preferences?t=${token}`);
export const oneClickUrl = (token: string, purpose: Purpose | "all") => publicUrl(`/api/unsubscribe?t=${token}&p=${purpose}`);

/**
 * What the law asks every commercial email to carry (Spam Act; The
 * Marketing Engine §05.4): who we are, how to reach us, and how to stop.
 */
export function commercialFooter(token: string, abn: string) {
  return [
    `Equine Professionals Australia${abn ? `, ABN ${abn}` : ""}. Write to us at ${CONTACT_EMAIL}.`,
    `Choose what we send you, or stop it all: ${preferencesUrl(token)}`,
  ].join("\n");
}
