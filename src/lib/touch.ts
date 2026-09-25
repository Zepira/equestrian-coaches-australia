import type { NextResponse } from "next/server";
import type { Touch } from "@/lib/audience";

/**
 * Where a visitor came from (The Marketing Engine M2). Two cookies: the
 * first source we ever saw for this browser (kept, never replaced) and the
 * most recent one. A /go/ link or any address carrying utm_source or ref
 * sets them; sign-up and alert sign-ups copy them onto the contact.
 * No imports beyond types, so the proxy can use it.
 */
export const FIRST_TOUCH = "epa_ft";
export const LAST_TOUCH = "epa_lt";
const MAX_AGE = 60 * 60 * 24 * 90;

const clean = (v: string | null | undefined, max = 60) => (v ?? "").trim().slice(0, max).replace(/[^\w .:/-]/g, "");

/** A touch from an address's query string, or null when it carries no source. */
export function touchFromParams(params: URLSearchParams, link?: string): Touch | null {
  const source = clean(params.get("utm_source") || params.get("ref"));
  if (!source) return null;
  const touch: Touch = { source, at: new Date().toISOString() };
  const medium = clean(params.get("utm_medium"));
  const campaign = clean(params.get("utm_campaign"));
  if (medium) touch.medium = medium;
  if (campaign) touch.campaign = campaign;
  if (link) touch.link = clean(link);
  return touch;
}

/** Sets the two cookies on a response. The first one is only set if the browser doesn't have one. */
export function setTouchCookies(response: NextResponse, touch: Touch, hasFirst: boolean) {
  const opts = { maxAge: MAX_AGE, path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" };
  const value = encodeURIComponent(JSON.stringify(touch));
  if (!hasFirst) response.cookies.set(FIRST_TOUCH, value, opts);
  response.cookies.set(LAST_TOUCH, value, opts);
}

/** Reads a touch cookie's value back, or null if it's missing or not ours. */
export function parseTouch(raw: string | undefined): Touch | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(decodeURIComponent(raw)) as Touch;
    return typeof t?.source === "string" && t.source ? { ...t, source: clean(t.source) } : null;
  } catch {
    return null;
  }
}
