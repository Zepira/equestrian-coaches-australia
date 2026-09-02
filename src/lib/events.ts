import { createClient as createServiceClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import crypto from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type EventKind =
  | "search_performed"
  | "result_impression"
  | "result_click"
  | "profile_view"
  | "contact_reveal"
  | "enquiry_sent"
  | "clinic_view"
  | "clinic_enquiry"
  | "share_click"
  | "referral_signup";

const BOT_UA_PATTERN =
  /bot|crawler|spider|slurp|facebookexternalhit|googlebot|bingbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
const MOBILE_UA_PATTERN = /mobile|android|iphone|ipad|ipod/i;

// Just enough to populate device_class sensibly on write — the "exclude
// bots from every displayed number" logic is the separate Bot filtering
// card; nothing reads/aggregates events yet to exclude from.
function classifyDevice(userAgent: string): "bot" | "mobile" | "desktop" {
  if (BOT_UA_PATTERN.test(userAgent)) return "bot";
  if (MOBILE_UA_PATTERN.test(userAgent)) return "mobile";
  return "desktop";
}

// Changes every UTC day, not every month (spec: "dedupes a refresh
// without following anyone around") — a hash from today can never be
// correlated to the same visitor's hash tomorrow.
function dailySalt(): string {
  const today = new Date().toISOString().slice(0, 10);
  const secret = process.env.EVENT_SALT_SECRET ?? "dev-only-salt-set-EVENT_SALT_SECRET-before-launch";
  return crypto.createHash("sha256").update(`${secret}:${today}`).digest("hex");
}

async function requestContext() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = h.get("user-agent") ?? "unknown";
  const referrer = h.get("referer");
  let referrerHost: string | null = null;
  if (referrer) {
    try {
      referrerHost = new URL(referrer).hostname;
    } catch {
      referrerHost = null; // malformed Referer header — not worth failing the log over
    }
  }

  return {
    sessionHash: crypto.createHash("sha256").update(`${dailySalt()}:${ip}:${userAgent}`).digest("hex"),
    deviceClass: classifyDevice(userAgent),
    referrerHost,
  };
}

// The append-only event log ("Build · Prove the value" spec) — every write
// goes through the service-role client since public.events has no anon
// insert policy (see 0018_events.sql). Never throws: a logging failure
// should never break the page that triggered it, same shape as
// logSearchEvent.
export async function logEvent(event: {
  kind: EventKind;
  coachId?: string | null;
  areaId?: string | null;
  termId?: string | null;
  channel?: string | null;
  position?: number | null;
  query?: string | null;
  source?: string | null;
  campaign?: string | null;
  meta?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured) return; // no live project — nothing to log to

  try {
    const { sessionHash, deviceClass, referrerHost } = await requestContext();
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("events").insert({
      kind: event.kind,
      coach_id: event.coachId ?? null,
      area_id: event.areaId ?? null,
      term_id: event.termId ?? null,
      channel: event.channel ?? null,
      position: event.position ?? null,
      query: event.query ?? null,
      source: event.source ?? null,
      campaign: event.campaign ?? null,
      referrer_host: referrerHost,
      session_hash: sessionHash,
      device_class: deviceClass,
      meta: event.meta ?? {},
    });
  } catch (err) {
    console.error("logEvent failed:", err);
  }
}
