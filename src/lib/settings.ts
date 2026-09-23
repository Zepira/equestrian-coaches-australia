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
  /** Last day of the founding offer, ISO date. Printed on /for-coaches. */
  founding_offer_ends: "2027-04-30",
} as const;

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

/** The founding offer's last day, as a UTC-midnight Date. Falls back to the default if the stored value is malformed. */
export async function getFoundingOfferEnd(): Promise<Date> {
  const raw = await getSetting("founding_offer_ends");
  const value = ISO_DATE.test(raw) ? raw : DEFAULTS.founding_offer_ends;
  return new Date(`${value}T00:00:00Z`);
}

/** "30 April 2027" — the way the date reads in Australian copy. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
