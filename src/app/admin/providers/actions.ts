"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminSetHidden } from "@/lib/provider-lifecycle";
import { createServiceSupabase } from "@/lib/supabase/service";

/**
 * Hide or show a profile from the Providers screen (§10). Status changes go
 * through provider-lifecycle with the service role, like every other one.
 */
export async function setProviderHidden(providerId: string, hidden: boolean) {
  const { userId } = await requireAdmin();
  const service = createServiceSupabase();
  if (!service) throw new Error("The service key isn't set.");
  await adminSetHidden(service, providerId, userId, hidden);
  revalidatePath("/admin/providers");
  revalidatePath("/search");
}

/**
 * Registration checked against the public register (The Marketing Engine
 * §05.12): lets the profile use its profession's protected titles, and shows
 * the check date on the profile. Specialist is its own tick, for vets.
 */
export async function setRegistrationChecked(providerId: string, fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const checked = fd.get("checked") === "on";
  const specialist = fd.get("specialist") === "on";
  const { data: before } = await supabase.from("providers").select("slug, registration_number, registration_checked_at, specialist_checked").eq("id", providerId).single();
  if (!before) return;
  if (checked && !before.registration_number) throw new Error("There's no registration number to check.");
  const { error } = await supabase
    .from("providers")
    .update({
      registration_checked_at: checked ? (before.registration_checked_at ?? new Date().toISOString()) : null,
      registration_checked_by: checked ? userId : null,
      specialist_checked: checked && specialist,
    })
    .eq("id", providerId);
  if (error) throw error;
  // The change log is written by the service role (its insert policy is for members).
  await createServiceSupabase()?.from("provider_changes").insert({
    provider_id: providerId,
    field: checked ? `registration checked${specialist ? " (specialist)" : ""}` : "registration check removed",
    old_value: before.registration_number,
    new_value: before.registration_number,
    changed_by: userId,
  });
  revalidatePath("/admin/providers");
  revalidatePath(`/profile/${before.slug}`);
}
