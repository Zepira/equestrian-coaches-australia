import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * The dashboard's numbers — "appeared in search", "profile views", "tapped
 * to call" — written server-side only (coach_events has no insert policy),
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

async function log(kind: CoachEventKind, coachIds: string[]) {
  if (!isSupabaseConfigured || coachIds.length === 0) return;
  const real = coachIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)); // never mock:* sentinels
  if (real.length === 0) return;
  try {
    const hash = await visitorHash();
    const rows = real.map((coach_id) => ({ coach_id, kind, visitor_hash: hash }));
    // The partial unique index turns a same-day repeat into a no-op.
    await service().from("coach_events").upsert(rows, {
      onConflict: "coach_id,kind,visitor_hash,event_day",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error(`coach-events: ${kind} failed`, err);
  }
}

/** Every coach id a search result set contained — fire once per search. */
export const logImpressions = (coachIds: string[]) => log("impression", coachIds);
/** A profile page render. */
export const logView = (coachId: string) => log("view", [coachId]);
/** A click on "Show phone number". */
export const logReveal = (coachId: string) => log("reveal", [coachId]);
