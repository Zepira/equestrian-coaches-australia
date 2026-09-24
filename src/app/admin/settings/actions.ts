"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe";
import { TIERS, capabilityJson } from "@/lib/tiers";
import {
  LOCKED_ONCE_SET,
  SETTINGS_TAG,
  SETTING_RANGES,
  isEmail,
  parseEmailList,
  getPlans,
  readPlanCapability,
  readPlanInfo,
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
  plan_capabilities(raw) {
    const parsed = parseObject(raw);
    if (!parsed) return { error: "That isn't a valid set of plan features." };
    for (const t of TIERS) {
      if (!readPlanCapability(parsed[t])) return { error: `Check ${t}: events is a whole number from 0 to 100, or blank for unlimited.` };
    }
    return {
      value: JSON.stringify(
        Object.fromEntries(TIERS.map((t) => {
          return [t, capabilityJson(readPlanCapability(parsed[t])!)];
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
  review_alert_emails: [],
  area_page_min_providers: ["/sitemap.xml"],
  featured_min_providers: ["/search"],
  featured_slots_per_area: ["/search"],
  plans: ["/", "/coaches", "/horse-care", "/for-coaches", "/list-your-business", "/dashboard", "/dashboard/billing"],
  plan_capabilities: ["/dashboard", "/dashboard/clinics", "/dashboard/profile"],
};

export async function saveSetting(formData: FormData) {
  const key = String(formData.get("key") ?? "") as SettingKey;
  await writeSetting(key, String(formData.get("value") ?? ""));
}

/** The plans form: name, tagline and both prices for each tier, saved as one `plans` value. */
export async function savePlans(formData: FormData) {
  const field = (t: string, f: string) => String(formData.get(`${t}.${f}`) ?? "").trim();
  const next = Object.fromEntries(
    TIERS.map((t) => [t, { name: field(t, "name"), tagline: field(t, "tagline"), monthly: field(t, "monthly"), yearly: field(t, "yearly") }])
  );
  // Prices shown must match what Stripe charges (CLAUDE.md, "Prices are the
  // exception"). Until the plans screen can check a price against its Stripe
  // Price, a live Stripe account means prices can't change from here.
  if (isStripeConfigured) {
    const current = await getPlans();
    const moved = TIERS.some((t) => next[t].monthly !== current[t].monthly || next[t].yearly !== current[t].yearly);
    if (moved) {
      redirect(`/admin/settings?error=${encodeURIComponent("Prices are paired with Stripe and can't be changed here yet. Names and taglines can.")}&key=plans`);
    }
  }
  await writeSetting("plans", JSON.stringify(next));
}

/** The plan features form: event limit (blank = unlimited), video and a featured spot, per tier. */
export async function savePlanCapabilities(formData: FormData) {
  const next = Object.fromEntries(
    TIERS.map((t) => {
      const raw = String(formData.get(`${t}.event_limit`) ?? "").trim();
      return [t, { event_limit: raw === "" ? null : Number(raw), video: formData.get(`${t}.video`) === "on", featured: formData.get(`${t}.featured`) === "on" }];
    })
  );
  await writeSetting("plan_capabilities", JSON.stringify(next));
}

async function writeSetting(key: SettingKey, raw: string) {
  const supabase = await requireAdmin();
  if (!(key in VALIDATORS)) throw new Error("Unknown setting.");

  // Some keys lock once set (the launch date). Enforced here, not only by
  // hiding the field, so a hand-made request can't change them either.
  if (LOCKED_ONCE_SET.has(key)) {
    const { data: current } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (current?.value) {
      redirect(`/admin/settings?error=${encodeURIComponent("This is locked. It can only be changed in the database.")}&key=${key}`);
    }
  }

  const result = VALIDATORS[key](raw);
  if ("error" in result) {
    redirect(`/admin/settings?error=${encodeURIComponent(result.error)}&key=${key}`);
  }

  // Update first, insert only if the row is missing. Not an upsert: on a
  // conflict Postgres fires the BEFORE INSERT trigger and then the BEFORE
  // UPDATE one, which would write two history rows for one change.
  const { data: updated, error } = await supabase
    .from("settings")
    .update({ value: result.value })
    .eq("key", key)
    .select("key");
  if (error) throw error;
  if (!updated?.length) {
    const { error: insertError } = await supabase.from("settings").insert({ key, value: result.value });
    if (insertError) throw insertError;
  }

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
  revalidatePath("/admin/settings");
  for (const path of SHOWN_ON[key]) revalidatePath(path);
  redirect(`/admin/settings?saved=${key}`);
}
