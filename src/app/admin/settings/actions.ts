"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearSettingsCache, type SettingKey } from "@/lib/settings";

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
const VALIDATORS: Record<SettingKey, (raw: string) => { value: string } | { error: string }> = {
  founding_offer_ends(raw) {
    const value = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "Enter a date." };
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return { error: "That isn't a real date." };
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) return { error: "The offer can't end in the past." };
    const limit = new Date(today);
    limit.setUTCFullYear(limit.getUTCFullYear() + 3);
    if (date > limit) return { error: "More than three years away — check the year." };
    return { value };
  },
};

/** Pages that print each setting, revalidated on save. */
const SHOWN_ON: Record<SettingKey, string[]> = {
  founding_offer_ends: ["/for-coaches"],
};

export async function saveSetting(formData: FormData) {
  const supabase = await requireAdmin();

  const key = String(formData.get("key") ?? "") as SettingKey;
  if (!(key in VALIDATORS)) throw new Error("Unknown setting.");

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
