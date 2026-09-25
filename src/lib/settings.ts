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
  type Tier,
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
  /**
   * Whether the sample coaches and professionals show on the site. On before
   * launch; switched off on launch day. A profession with one real published
   * provider stops showing samples on its own either way (src/lib/samples.ts).
   */
  show_sample_listings: "true",
  /**
   * Whether the solicitor has signed off the terms and privacy policy. Until
   * then both pages say they're a draft and stay out of search results.
   */
  legal_approved: "false",
  /** The partnership's ABN, for the footer of every commercial email (Spam Act). Empty until registered. */
  business_abn: "",
  /** The gentle slide-in offering area alerts (The Marketing Engine M3): off until someone turns it on. */
  slide_in_enabled: "false",
  /** Seconds on a page before it slides in. */
  slide_in_delay_seconds: "25",
  /** Days before the same visitor sees it again. */
  slide_in_every_days: "14",
  /** How complete (out of 100) a new profile must be for the "New profile" emails to stop (M7). */
  onboarding_complete_pct: "90",
  /** Days after an enquiry before we ask the rider "Did you end up booking?" (M5). */
  enquiry_followup_days: "21",
  /**
   * "true": every review waits for a person before it shows. "false": a review
   * that passes the duplicate checks goes up once the reviewer confirms their
   * email, and only flagged ones wait (M5).
   */
  reviews_hold_all: "true",
  /** Free months a referrer earns when a colleague they referred first pays (M6). */
  referral_reward_months: "1",
  /** The most referral rewards one professional can earn in a year. */
  referral_cap_per_year: "12",
  /** The Stripe coupon that gives a referred colleague their first month free. Empty until Stripe exists. */
  referral_coupon_id: "",
  /** What a founding member pays once their free period ends, kept for as long as they stay (§09). */
  founding_price: "$9.99",
  /**
   * The Stripe Price behind each display price, JSON: { listed: { monthly,
   * yearly }, spotlight: …, clinic: …, founding }. Stored beside the display
   * prices and checked against Stripe on save, so the site never shows one
   * number and charges another. Defaults to the env vars used before admin
   * could set them.
   */
  stripe_prices: JSON.stringify({
    listed: { monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_LISTED ?? "", yearly: "" },
    spotlight: { monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPOTLIGHT ?? "", yearly: "" },
    clinic: { monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINIC ?? "", yearly: "" },
    founding: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDING ?? "",
  }),
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
  enquiry_followup_days: [7, 90],
  onboarding_complete_pct: [50, 100],
  referral_reward_months: [1, 3],
  referral_cap_per_year: [0, 24],
  slide_in_delay_seconds: [5, 300],
  slide_in_every_days: [1, 180],
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

export const getSlideInDelaySeconds = () => intSetting("slide_in_delay_seconds", ...SETTING_RANGES.slide_in_delay_seconds);
export const getSlideInEveryDays = () => intSetting("slide_in_every_days", ...SETTING_RANGES.slide_in_every_days);
export async function isSlideInEnabled(): Promise<boolean> {
  return (await getSetting("slide_in_enabled")) === "true";
}
/** The ABN, digits in groups ("12 345 678 901"), or "" before it's registered. */
export async function getBusinessAbn(): Promise<string> {
  const d = (await getSetting("business_abn")).replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : "";
}

export const getReferralRewardMonths = () => intSetting("referral_reward_months", ...SETTING_RANGES.referral_reward_months);
export const getReferralCapPerYear = () => intSetting("referral_cap_per_year", ...SETTING_RANGES.referral_cap_per_year);
export async function getReferralCouponId(): Promise<string> {
  return (await getSetting("referral_coupon_id")).trim();
}

export const getOnboardingCompletePct = () => intSetting("onboarding_complete_pct", ...SETTING_RANGES.onboarding_complete_pct);
export const getEnquiryFollowupDays = () => intSetting("enquiry_followup_days", ...SETTING_RANGES.enquiry_followup_days);
export async function holdAllReviews(): Promise<boolean> {
  return (await getSetting("reviews_hold_all")) !== "false";
}

export async function isLegalApproved(): Promise<boolean> {
  return (await getSetting("legal_approved")) === "true";
}

export async function showSampleListings(): Promise<boolean> {
  return (await getSetting("show_sample_listings")) !== "false";
}

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

/** The founding members' locked price, "$9.99". */
export async function getFoundingPrice(): Promise<string> {
  const v = (await getSetting("founding_price")).trim();
  return PRICE.test(v) ? v : DEFAULTS.founding_price;
}

export type StripePrices = Record<Tier, { monthly: string; yearly: string }> & { founding: string };
export const STRIPE_PRICE_ID = /^price_[A-Za-z0-9]+$/;

/** A stored stripe_prices value, each ID either empty or shaped like a Stripe Price ID; null if malformed. */
export function readStripePrices(v: unknown): StripePrices | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = (x: unknown) => (typeof x === "string" && (x === "" || STRIPE_PRICE_ID.test(x)) ? x : null);
  const out: Partial<StripePrices> = {};
  for (const t of TIERS) {
    const p = o[t] as Record<string, unknown> | undefined;
    const monthly = id(p?.monthly ?? "");
    const yearly = id(p?.yearly ?? "");
    if (monthly === null || yearly === null) return null;
    out[t] = { monthly, yearly };
  }
  const founding = id(o.founding ?? "");
  if (founding === null) return null;
  return { ...(out as Record<Tier, { monthly: string; yearly: string }>), founding };
}

/** Stripe Price IDs for checkout and the webhook. */
export async function getStripePrices(): Promise<StripePrices> {
  return readStripePrices(parseJson(await getSetting("stripe_prices"))) ?? (readStripePrices(JSON.parse(DEFAULTS.stripe_prices)) as StripePrices);
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
