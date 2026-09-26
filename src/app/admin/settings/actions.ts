"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { DEFAULT_CAPABILITIES, TIERS, capabilityJson, type Tier } from "@/lib/tiers";
import {
  LOCKED_ONCE_SET,
  SETTINGS_TAG,
  SETTING_RANGES,
  isEmail,
  parseEmailList,
  readPlanCapability,
  readPlanInfo,
  readStripePrices,
  PRICE,
  type SettingKey,
} from "@/lib/settings";
import { createServiceSupabase } from "@/lib/supabase/service";
import { activateFoundingMembers } from "@/lib/founding";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not an admin.");
  return supabase;
}

/**
 * One validator per key. Each returns the normalised value to store, or an
 * error message. A value that does not validate is refused, never applied
 * (CLAUDE.md "Configuration over hardcoding", point 3).
 */
function parseDate(raw: string): { date: Date; value: string } | { error: string } {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "Enter a date." };
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return { error: "That isn't a real date." };
  return { date, value };
}

function todayUtc() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

const VALIDATORS: Record<SettingKey, (raw: string) => { value: string } | { error: string }> = {
  launch_date(raw) {
    const parsed = parseDate(raw);
    if ("error" in parsed) return parsed;
    // Set on launch day, so it should be close to today. A month either way
    // allows for setting it a little late, and catches a mistyped year.
    const diffDays = Math.abs(parsed.date.getTime() - todayUtc().getTime()) / 86_400_000;
    if (diffDays > 31) return { error: "The launch date should be within a month of today. Check the year." };
    return { value: parsed.value };
  },
  founding_free_months(raw) {
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < 1 || n > 24) return { error: "Enter a whole number of months, 1 to 24." };
    return { value: String(n) };
  },
  founding_join_by(raw) {
    // Empty clears it: the offer stays open with no end date.
    if (!raw.trim()) return { value: "" };
    const parsed = parseDate(raw);
    if ("error" in parsed) return parsed;
    if (parsed.date < todayUtc()) return { error: "The last day to join can't be in the past." };
    const limit = todayUtc();
    limit.setUTCFullYear(limit.getUTCFullYear() + 3);
    if (parsed.date > limit) return { error: "More than three years away. Check the year." };
    return { value: parsed.value };
  },
  review_required(raw) {
    const v = raw.trim();
    if (v !== "true" && v !== "false") return { error: "Choose on or off." };
    return { value: v };
  },
  referral_reward_months: wholeNumber("referral_reward_months"),
  referral_cap_per_year: wholeNumber("referral_cap_per_year"),
  referral_coupon_id(raw) {
    const v = raw.trim();
    if (v && !/^[A-Za-z0-9_-]{2,60}$/.test(v)) return { error: "A Stripe coupon ID is letters, numbers, - and _." };
    return { value: v };
  },
  business_abn(raw) {
    const d = raw.replace(/\s/g, "");
    if (d === "") return { value: "" };
    if (!/^\d{11}$/.test(d)) return { error: "An ABN is 11 digits." };
    return { value: d };
  },
  slide_in_enabled(raw) {
    const v = raw.trim();
    if (v !== "true" && v !== "false") return { error: "Choose on or off." };
    return { value: v };
  },
  slide_in_delay_seconds: wholeNumber("slide_in_delay_seconds"),
  slide_in_every_days: wholeNumber("slide_in_every_days"),
  legal_approved(raw) {
    const v = raw.trim();
    if (v !== "true" && v !== "false") return { error: "Choose approved or draft." };
    return { value: v };
  },
  enquiry_followup_days: wholeNumber("enquiry_followup_days"),
  onboarding_complete_pct: wholeNumber("onboarding_complete_pct"),
  pause_max_months: wholeNumber("pause_max_months"),
  riders_choice_min_reviews: wholeNumber("riders_choice_min_reviews"),
  quiet_rider_days: wholeNumber("quiet_rider_days"),
  reviews_hold_all(raw) {
    const v = raw.trim();
    if (v !== "true" && v !== "false") return { error: "Choose hold every review or only flagged ones." };
    return { value: v };
  },
  show_sample_listings(raw) {
    const v = raw.trim();
    if (v !== "true" && v !== "false") return { error: "Choose on or off." };
    return { value: v };
  },
  review_alert_emails(raw) {
    const list = parseEmailList(raw);
    const bad = list.find((e) => !isEmail(e));
    if (bad) return { error: `"${bad}" isn't an email address.` };
    if (list.length > 10) return { error: "Ten addresses at most." };
    return { value: list.join(", ") };
  },
  area_page_min_providers: wholeNumber("area_page_min_providers"),
  featured_min_providers: wholeNumber("featured_min_providers"),
  featured_slots_per_area: wholeNumber("featured_slots_per_area"),
  event_reach_km: wholeNumber("event_reach_km"),
  benchmark_min_providers: wholeNumber("benchmark_min_providers"),
  plans(raw) {
    const parsed = parseObject(raw);
    if (!parsed) return { error: "That isn't a valid set of plans." };
    for (const t of TIERS) {
      if (!readPlanInfo(parsed[t])) {
        return { error: `Check ${t}: a name (up to 30 characters), a tagline (up to 80) and prices written like $9.99 or $99.` };
      }
    }
    return { value: JSON.stringify(Object.fromEntries(TIERS.map((t) => [t, readPlanInfo(parsed[t])]))) };
  },
  founding_price(raw) {
    const v = raw.trim();
    if (!PRICE.test(v)) return { error: "Write the founding price like $9.99." };
    return { value: v };
  },
  stripe_prices(raw) {
    const parsed = readStripePrices(parseObject(raw));
    if (!parsed) return { error: "Stripe price IDs start with price_ and have no spaces." };
    return { value: JSON.stringify(parsed) };
  },
  plan_capabilities(raw) {
    const parsed = parseObject(raw);
    if (!parsed) return { error: "That isn't a valid set of plan features." };
    for (const t of TIERS) {
      if (!readPlanCapability(parsed[t], DEFAULT_CAPABILITIES[t])) return { error: `Check ${t}: events is a whole number from 0 to 100, or blank for unlimited.` };
    }
    return {
      value: JSON.stringify(
        Object.fromEntries(TIERS.map((t) => {
          return [t, capabilityJson(readPlanCapability(parsed[t], DEFAULT_CAPABILITIES[t])!)];
        }))
      ),
    };
  },
};

function wholeNumber(key: keyof typeof SETTING_RANGES) {
  const [min, max] = SETTING_RANGES[key];
  return (raw: string): { value: string } | { error: string } => {
    const n = Number(raw.trim());
    if (!raw.trim() || !Number.isInteger(n) || n < min || n > max) return { error: `Enter a whole number from ${min} to ${max}.` };
    return { value: String(n) };
  };
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Pages that print each setting, revalidated on save. */
const SHOWN_ON: Record<SettingKey, string[]> = {
  launch_date: ["/for-coaches"],
  founding_free_months: ["/for-coaches"],
  founding_join_by: ["/for-coaches"],
  review_required: [],
  show_sample_listings: ["/", "/coaches", "/horse-care", "/search"],
  legal_approved: ["/terms", "/privacy", "/sitemap.xml"],
  business_abn: [],
  referral_reward_months: [],
  enquiry_followup_days: [],
  onboarding_complete_pct: [],
  pause_max_months: ["/dashboard/billing"],
  riders_choice_min_reviews: ["/riders-choice"],
  quiet_rider_days: [],
  reviews_hold_all: [],
  referral_cap_per_year: [],
  referral_coupon_id: [],
  slide_in_enabled: [],
  slide_in_delay_seconds: [],
  slide_in_every_days: [],
  review_alert_emails: [],
  area_page_min_providers: ["/sitemap.xml"],
  featured_min_providers: ["/search"],
  featured_slots_per_area: ["/search"],
  event_reach_km: [],
  benchmark_min_providers: ["/dashboard"],
  plans: ["/", "/coaches", "/horse-care", "/for-coaches", "/for-professionals", "/list-your-business", "/dashboard", "/dashboard/billing"],
  founding_price: ["/for-coaches", "/onboarding", "/dashboard/billing"],
  stripe_prices: [],
  plan_capabilities: ["/dashboard", "/dashboard/clinics", "/dashboard/profile"],
};

export async function saveSetting(formData: FormData) {
  const key = String(formData.get("key") ?? "") as SettingKey;
  // Some settings are edited from another tab (the slide-in's, on On the site); go back there.
  const back = String(formData.get("back") ?? "");
  await writeSetting(key, String(formData.get("value") ?? ""), back === "/admin/on-site" || back === "/admin/codes" || back === "/admin/reviews" || back === "/admin/sequences" || back === "/admin/campaigns" || back === "/admin/awards" ? back : "/admin/settings");
}

/** "$24.95" → 2495. */
const cents = (price: string) => Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);

/**
 * Checks one display price against its Stripe Price: it exists, it's live,
 * it's in AUD, it recurs on the right interval and it charges exactly the
 * amount shown. A mismatch refuses the whole save (CLAUDE.md, "Prices are the
 * exception"): showing one figure and charging another is a consumer-law
 * problem, not a typo.
 */
async function checkStripePrice(label: string, id: string, shown: string, interval: "month" | "year"): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  if (!id) return `${label} needs its Stripe price ID now that Stripe is connected.`;
  try {
    const price = await stripe.prices.retrieve(id);
    if (!price.active) return `${label}: that Stripe price is archived.`;
    if (price.currency !== "aud") return `${label}: that Stripe price isn't in Australian dollars.`;
    if (price.recurring?.interval !== interval) return `${label}: that Stripe price isn't charged ${interval === "month" ? "monthly" : "yearly"}.`;
    if (price.unit_amount !== cents(shown)) {
      return `${label}: Stripe charges $${((price.unit_amount ?? 0) / 100).toFixed(2)}, but the page would show ${shown}. Make a new price in Stripe at ${shown} and paste its ID, or change the price shown.`;
    }
    return null;
  } catch {
    return `${label}: Stripe has no price ${id}.`;
  }
}

/**
 * The plans form (Admin → Plans and prices): each plan's name, tagline,
 * display prices and their Stripe Price IDs, and the founding price and its
 * ID, saved together or not at all. With Stripe connected every price is
 * checked against its ID first; without it (mock payments) the IDs are
 * stored as typed and checked the first time the plans are saved after
 * Stripe is connected.
 */
export async function savePlansAndPrices(formData: FormData) {
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const back = (message: string) => redirect(`/admin/plans?error=${encodeURIComponent(message)}`);
  const plans = Object.fromEntries(
    TIERS.map((t) => [t, { name: field(`${t}.name`), tagline: field(`${t}.tagline`), monthly: field(`${t}.monthly`), yearly: field(`${t}.yearly`) }])
  );
  const foundingPrice = field("founding.price");
  const ids = {
    ...(Object.fromEntries(TIERS.map((t) => [t, { monthly: field(`${t}.monthly_id`), yearly: field(`${t}.yearly_id`) }])) as Record<Tier, { monthly: string; yearly: string }>),
    founding: field("founding.id"),
  };

  for (const [key, raw] of [["plans", JSON.stringify(plans)], ["founding_price", foundingPrice], ["stripe_prices", JSON.stringify(ids)]] as const) {
    const r = VALIDATORS[key](raw);
    if ("error" in r) back(r.error);
  }

  if (isStripeConfigured) {
    const checks = await Promise.all([
      ...TIERS.flatMap((t) => [
        checkStripePrice(`${plans[t].name} monthly`, ids[t].monthly, plans[t].monthly, "month"),
        // A yearly price is only checked once there's a yearly Stripe price to sell.
        ids[t].yearly ? checkStripePrice(`${plans[t].name} yearly`, ids[t].yearly, plans[t].yearly, "year") : null,
      ]),
      checkStripePrice("Founding price", ids.founding, foundingPrice, "month"),
    ]);
    const problem = checks.find(Boolean);
    if (problem) back(problem);
  }

  const { supabase } = await requireAdminWithId();
  for (const [key, value] of [["plans", VALIDATORS.plans(JSON.stringify(plans))], ["founding_price", VALIDATORS.founding_price(foundingPrice)], ["stripe_prices", VALIDATORS.stripe_prices(JSON.stringify(ids))]] as const) {
    if ("value" in value) await storeSetting(supabase, key, value.value);
  }
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  for (const path of [...SHOWN_ON.plans, ...SHOWN_ON.founding_price]) revalidatePath(path);
  revalidatePath("/admin/plans");
  redirect("/admin/plans?saved=plans");
}

/** The plan features form: event limit (blank = unlimited), video and a featured spot, per tier. */
export async function savePlanCapabilities(formData: FormData) {
  const next = Object.fromEntries(
    TIERS.map((t) => {
      const raw = String(formData.get(`${t}.event_limit`) ?? "").trim();
      return [t, { event_limit: raw === "" ? null : Number(raw), video: formData.get(`${t}.video`) === "on", featured: formData.get(`${t}.featured`) === "on", benchmarks: formData.get(`${t}.benchmarks`) === "on" }];
    })
  );
  await writeSetting("plan_capabilities", JSON.stringify(next), "/admin/plans");
}

async function requireAdminWithId() {
  return { supabase: await requireAdmin() };
}

/** Update, else insert: an upsert fires both history triggers for one change. */
async function storeSetting(supabase: Awaited<ReturnType<typeof requireAdmin>>, key: SettingKey, value: string) {
  const { data: updated, error } = await supabase.from("settings").update({ value }).eq("key", key).select("key");
  if (error) throw error;
  if (!updated?.length) {
    const { error: insertError } = await supabase.from("settings").insert({ key, value });
    if (insertError) throw insertError;
  }
}

async function writeSetting(key: SettingKey, raw: string, page = "/admin/settings") {
  const supabase = await requireAdmin();
  if (!(key in VALIDATORS)) throw new Error("Unknown setting.");

  // Some keys lock once set (the launch date). Enforced here, not only by
  // hiding the field, so a hand-made request can't change them either.
  if (LOCKED_ONCE_SET.has(key)) {
    const { data: current } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (current?.value) {
      redirect(`${page}?error=${encodeURIComponent("This is locked. It can only be changed in the database.")}&key=${key}`);
    }
  }

  const result = VALIDATORS[key](raw);
  if ("error" in result) {
    redirect(`${page}?error=${encodeURIComponent(result.error)}&key=${key}`);
  }

  // Update first, insert only if the row is missing. Not an upsert: on a
  // conflict Postgres fires the BEFORE INSERT trigger and then the BEFORE
  // UPDATE one, which would write two history rows for one change.
  await storeSetting(supabase, key, result.value);

  // Locking the launch date starts every saved-card founding member's free
  // period and emails them their first charge date (src/lib/founding.ts).
  if (key === "launch_date") {
    const service = createServiceSupabase();
    if (service) await activateFoundingMembers(service, new Date(`${result.value}T00:00:00Z`));
  }

  // A new gate applies now, not at tonight's recompute.
  if (key === "area_page_min_providers") {
    const service = createServiceSupabase();
    await service?.rpc("recompute_indexable_pages", { p_min_providers: Number(result.value) });
  }

  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath(page);
  for (const path of SHOWN_ON[key]) revalidatePath(path);
  // Samples appear on every listing and profile page.
  if (key === "show_sample_listings" || key.startsWith("slide_in_")) revalidatePath("/", "layout");
  redirect(`${page}?saved=${key}`);
}
