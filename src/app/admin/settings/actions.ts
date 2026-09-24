"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCKED_ONCE_SET, clearSettingsCache, type SettingKey } from "@/lib/settings";

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
};

/** Pages that print each setting, revalidated on save. */
const SHOWN_ON: Record<SettingKey, string[]> = {
  launch_date: ["/for-coaches"],
  founding_free_months: ["/for-coaches"],
  founding_join_by: ["/for-coaches"],
};

export async function saveSetting(formData: FormData) {
  const supabase = await requireAdmin();

  const key = String(formData.get("key") ?? "") as SettingKey;
  if (!(key in VALIDATORS)) throw new Error("Unknown setting.");

  // Some keys lock once set (the launch date). Enforced here, not only by
  // hiding the field, so a hand-made request can't change them either.
  if (LOCKED_ONCE_SET.has(key)) {
    const { data: current } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (current?.value) {
      redirect(`/admin/settings?error=${encodeURIComponent("This is locked. It can only be changed in the database.")}&key=${key}`);
    }
  }

  const result = VALIDATORS[key](String(formData.get("value") ?? ""));
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

  clearSettingsCache();
  revalidatePath("/admin/settings");
  for (const path of SHOWN_ON[key]) revalidatePath(path);
  redirect(`/admin/settings?saved=${key}`);
}
