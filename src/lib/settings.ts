import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import {
  DEFAULT_CAPABILITIES,
  DEFAULT_PLANS,
  TIERS,
  capabilityJson,
  type PlanCapabilities,
  type PlanCapability,
  type PlanInfo,
  type Plans,
} from "@/lib/tiers";

/**
 * Business settings (CLAUDE.md "Configuration over hardcoding").
 *
 * Every key has a code default here, a typed accessor, and validation in the
 * admin action that writes it. Reads use the cookie-free public client (so
 * the pages that show a setting can stay static) and are cached for 60s
 * under the SETTINGS_TAG tag, which the admin save clears.
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
  /** Whether a finished profile waits for a person to look at it before going live (§06.5). */
  review_required: "true",
  /** Who hears when a profile is submitted (or, with review off, when one goes live). Comma-separated. */
  review_alert_emails: "",
  /** Providers of one profession a place needs before its place pages exist (the gate, §05.2). */
  area_page_min_providers: "3",
  /** Providers of one profession near a place before a featured block shows there at all. */
  featured_min_providers: "8",
  /** Featured slots per profession per place. */
  featured_slots_per_area: "3",
  /** Fewest providers in a profession before the dashboard shows a benchmark (too few isn't a benchmark, or anonymous). */
  benchmark_min_providers: "5",
  /** How far a Clinic-tier event is emailed to riders, in km (others reach each rider's own alert radius, §07.2). */
  event_reach_km: "250",
  /** Plan names, display prices and taglines, JSON (PlanInfo per tier). */
  plans: JSON.stringify(DEFAULT_PLANS),
  /** What each plan unlocks, JSON: { tier: { event_limit: number | null, video: boolean, featured: boolean } }. */
  plan_capabilities: JSON.stringify(
    Object.fromEntries(TIERS.map((t) => [t, capabilityJson(DEFAULT_CAPABILITIES[t])]))
  ),
} as const satisfies Record<string, string>;

/** Keys that can be set once from admin and are then read-only there. */
export const LOCKED_ONCE_SET: ReadonlySet<SettingKey> = new Set<SettingKey>(["launch_date"]);

export type SettingKey = keyof typeof DEFAULTS;
export const SETTING_KEYS = Object.keys(DEFAULTS) as SettingKey[];

export const SETTINGS_TAG = "settings";

const loadAll = unstable_cache(
  async (): Promise<Partial<Record<SettingKey, string>>> => {
    const values: Partial<Record<SettingKey, string>> = {};
    const supabase = createPublicSupabase();
    if (supabase) {
      const { data } = await supabase.from("settings").select("key, value").in("key", SETTING_KEYS);
      for (const row of data ?? []) values[row.key as SettingKey] = row.value;
    }
    return values;
  },
  ["settings"],
  { tags: [SETTINGS_TAG], revalidate: 60 }
);

/** Raw string value, falling back to the code default when the row is missing. */
export async function getSetting(key: SettingKey): Promise<string> {
  const values = await loadAll();
  return values[key] ?? DEFAULTS[key];
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

// ── Gates and featured placement ───────────────────────────────────────────

/** Whole number from a setting, clamped to its allowed range, else the default. */
async function intSetting(key: SettingKey, min: number, max: number): Promise<number> {
  const n = Number(await getSetting(key));
  return Number.isInteger(n) && n >= min && n <= max ? n : Number(DEFAULTS[key]);
}

export const SETTING_RANGES = {
  area_page_min_providers: [1, 20],
  featured_min_providers: [2, 50],
  featured_slots_per_area: [0, 10],
  event_reach_km: [25, 2000],
  benchmark_min_providers: [3, 50],
} as const satisfies Partial<Record<SettingKey, readonly [number, number]>>;

export const getAreaPageMinProviders = () => intSetting("area_page_min_providers", ...SETTING_RANGES.area_page_min_providers);
export const getFeaturedMinProviders = () => intSetting("featured_min_providers", ...SETTING_RANGES.featured_min_providers);
export const getFeaturedSlotsPerArea = () => intSetting("featured_slots_per_area", ...SETTING_RANGES.featured_slots_per_area);
export const getBenchmarkMinProviders = () => intSetting("benchmark_min_providers", ...SETTING_RANGES.benchmark_min_providers);
export const getEventReachKm = () => intSetting("event_reach_km", ...SETTING_RANGES.event_reach_km);

// ── Review ─────────────────────────────────────────────────────────────────

export async function isReviewRequired(): Promise<boolean> {
  return (await getSetting("review_required")) !== "false";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function parseEmailList(raw: string): string[] {
  return raw.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
}
export function isEmail(value: string) {
  return EMAIL.test(value);
}

export async function getReviewAlertEmails(): Promise<string[]> {
  return parseEmailList(await getSetting("review_alert_emails")).filter(isEmail);
}

// ── Plans ──────────────────────────────────────────────────────────────────

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isText = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export const PRICE = /^\$\d{1,4}(\.\d{2})?$/;

/** A stored plan if every field is valid, else null. Shared with the admin validator. */
export function readPlanInfo(v: unknown): PlanInfo | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!isText(o.name, 30) || !isText(o.tagline, 80)) return null;
  if (typeof o.monthly !== "string" || !PRICE.test(o.monthly)) return null;
  if (typeof o.yearly !== "string" || !PRICE.test(o.yearly)) return null;
  return { name: o.name as string, monthly: o.monthly, yearly: o.yearly, tagline: o.tagline as string };
}

/**
 * A stored plan capability if every field present is valid, else null. A
 * switch added after the row was saved (benchmarks, say) takes the tier's
 * code default instead of throwing the whole row away.
 */
export function readPlanCapability(v: unknown, fallback: PlanCapability): PlanCapability | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const limit = "event_limit" in o ? o.event_limit : fallback.eventLimit;
  const limitOk = limit === null || (Number.isInteger(limit) && (limit as number) >= 0 && (limit as number) <= 100);
  const flag = (k: "video" | "featured" | "benchmarks") => (k in o ? o[k] : fallback[k]);
  if (!limitOk || [flag("video"), flag("featured"), flag("benchmarks")].some((x) => typeof x !== "boolean")) return null;
  return { eventLimit: limit as number | null, video: flag("video") as boolean, featured: flag("featured") as boolean, benchmarks: flag("benchmarks") as boolean };
}

/** Names, prices and taglines per plan; a malformed tier falls back to its default. */
export async function getPlans(): Promise<Plans> {
  const stored = parseJson(await getSetting("plans")) as Record<string, unknown> | null;
  return Object.fromEntries(TIERS.map((t) => [t, readPlanInfo(stored?.[t]) ?? DEFAULT_PLANS[t]])) as Plans;
}

/** What each plan unlocks; a malformed tier falls back to its default. */
export async function getPlanCapabilities(): Promise<PlanCapabilities> {
  const stored = parseJson(await getSetting("plan_capabilities")) as Record<string, unknown> | null;
  return Object.fromEntries(TIERS.map((t) => [t, readPlanCapability(stored?.[t], DEFAULT_CAPABILITIES[t]) ?? DEFAULT_CAPABILITIES[t]])) as PlanCapabilities;
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
