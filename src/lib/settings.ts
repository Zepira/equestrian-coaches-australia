import { createClient } from "@/lib/supabase/server";

/**
 * Business settings (CLAUDE.md "Configuration over hardcoding").
 *
 * Every key has a code default here, a typed accessor, and validation in the
 * admin action that writes it. Reads go through a short in-memory cache so a
 * page render never costs a database round trip per setting; the admin save
 * clears the cache and revalidates the pages that show the value.
 *
 * To add a setting: add a key + default to DEFAULTS, a typed accessor below,
 * a validator in src/app/admin/settings/actions.ts, and a field on the admin
 * page. Nothing else reads the table directly.
 */

export const DEFAULTS = {
  /**
   * The day the site launched, ISO date. Empty until launch day, when an
   * admin sets it once and it locks (see LOCKED_ONCE_SET). Every founding
   * member's free period is counted from it.
   */
  launch_date: "",
  /** Months after launch_date before a founding member is first charged. */
  founding_free_months: "6",
  /** Last day to sign up as a founding member, ISO date. Empty means still open. */
  founding_join_by: "",
} as const;

/** Keys that can be set once from admin and are then read-only there. */
export const LOCKED_ONCE_SET: ReadonlySet<SettingKey> = new Set<SettingKey>(["launch_date"]);

export type SettingKey = keyof typeof DEFAULTS;
export const SETTING_KEYS = Object.keys(DEFAULTS) as SettingKey[];

const TTL_MS = 60_000;
let cache: { at: number; values: Partial<Record<SettingKey, string>> } | null = null;

async function loadAll(): Promise<Partial<Record<SettingKey, string>>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const values: Partial<Record<SettingKey, string>> = {};
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.from("settings").select("key, value").in("key", SETTING_KEYS);
    for (const row of data ?? []) values[row.key as SettingKey] = row.value;
  }
  cache = { at: Date.now(), values };
  return values;
}

/** Raw string value, falling back to the code default when the row is missing. */
export async function getSetting(key: SettingKey): Promise<string> {
  const values = await loadAll();
  return values[key] ?? DEFAULTS[key];
}

export function clearSettingsCache() {
  cache = null;
}

// ── Typed accessors ─────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(raw: string): Date | null {
  if (!ISO_DATE.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Launch day, or null before launch. */
export async function getLaunchDate(): Promise<Date | null> {
  return parseIsoDate(await getSetting("launch_date"));
}

/** Free months for founding members (1 to 24; the default if the row is malformed). */
export async function getFoundingFreeMonths(): Promise<number> {
  const n = Number(await getSetting("founding_free_months"));
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : Number(DEFAULTS.founding_free_months);
}

/** When a founding member is first charged: launch date plus the free months. Null before launch. */
export async function getFirstChargeDate(): Promise<Date | null> {
  const launch = await getLaunchDate();
  if (!launch) return null;
  return addMonths(launch, await getFoundingFreeMonths());
}

/** The last day to join as a founding member, or null while the offer has no end date. */
export async function getFoundingJoinBy(): Promise<Date | null> {
  return parseIsoDate(await getSetting("founding_join_by"));
}

/** Whether a sign-up today still counts as founding. */
export async function isFoundingOpen(now = new Date()): Promise<boolean> {
  const joinBy = await getFoundingJoinBy();
  if (!joinBy) return true;
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return today <= joinBy;
}

/** Calendar months later, clamped to the month's last day (31 Aug + 6 = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return d;
}

/** 6 → "six": small counts read better as words in copy. */
export function countWord(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  return words[n] ?? String(n);
}

/** "30 April 2027" — the way the date reads in Australian copy. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
