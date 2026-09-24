import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * The dashboard's numbers — "appeared in search", "profile views", "tapped
 * to call" — written server-side only (provider_events has no insert policy),
 * never from the browser. Same degrade-gracefully shape as search-events:
 * a logging failure never breaks the page that triggered it.
 *
 * Dedupe: one row per visitor per coach per kind per day, keyed on a hash
 * of ip + user-agent + today's date + a server-side salt. The hash is not
 * reversible and rotates daily, so nothing in the table identifies a
 * person; it just stops one rider reloading a profile from counting as
 * twenty views.
 */
export type CoachEventKind = "impression" | "view" | "reveal";

async function visitorHash() {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
    const ua = h.get("user-agent") ?? "";
    const day = new Date().toISOString().slice(0, 10);
    const salt = process.env.COACH_EVENTS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eca";
    return createHash("sha256").update(`${ip}|${ua}|${day}|${salt}`).digest("hex").slice(0, 32);
  } catch {
    return null; // outside a request (cron, script) — no dedupe key
  }
}

function service() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Each provider's primary profession (lowest sort_order), for events logged
 * without one: a profile view or a phone reveal belongs to the section the
 * profile sits in (The Site as a CMS §08.1).
 */
async function primaryProfessions(ids: string[]) {
  const { data } = await service()
    .from("provider_terms")
    .select("provider_id, sort_order, terms!inner(id, kind)")
    .in("provider_id", ids)
    .eq("terms.kind", "profession")
    .order("sort_order");
  const map = new Map<string, string>();
  for (const r of data ?? []) if (!map.has(r.provider_id)) map.set(r.provider_id, (r as unknown as { terms: { id: string } }).terms.id);
  return map;
}

/** One row per provider; profession_id says which section it happened in. */
async function log(kind: CoachEventKind, rows: { id: string; professionId?: string | null }[]) {
  if (!isSupabaseConfigured || rows.length === 0) return;
  const real = rows.filter((r) => /^[0-9a-f-]{36}$/i.test(r.id)); // never mock:* sentinels
  if (real.length === 0) return;
  try {
    const hash = await visitorHash();
    const missing = real.filter((r) => !r.professionId).map((r) => r.id);
    const primary = missing.length ? await primaryProfessions(missing) : new Map<string, string>();
    const insert = real.map((r) => ({ provider_id: r.id, profession_id: r.professionId ?? primary.get(r.id) ?? null, kind, visitor_hash: hash }));
    // The unique index turns a same-day repeat into a no-op.
    await service().from("provider_events").upsert(insert, {
      onConflict: "provider_id,kind,visitor_hash,event_day,profession_id",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error(`coach-events: ${kind} failed`, err);
  }
}

/** Every provider a result set contained, with the profession they matched on. Fire once per page. */
export const logImpressions = (rows: { id: string; professionId?: string | null }[]) => log("impression", rows);
/** A profile page render, counted in the profile's primary section. */
export const logView = (providerId: string, professionId?: string | null) => log("view", [{ id: providerId, professionId }]);
/** A click on "Show phone number". */
export const logReveal = (providerId: string) => log("reveal", [{ id: providerId }]);

/** A provider's primary profession id, for rows like enquiries written elsewhere. */
export async function primaryProfessionOf(providerId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  return (await primaryProfessions([providerId])).get(providerId) ?? null;
}
