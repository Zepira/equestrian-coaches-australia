"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isEmail } from "@/lib/settings";

/**
 * Remove a rider on request (§10; the privacy policy's "we delete it when
 * you ask"). Deleting the auth user cascades to their profile, alerts,
 * favourites and notification log. Only riders: a professional's account
 * holds a listing and billing, which is a different conversation. The email
 * is typed twice so a slip can't delete the wrong person, and the log keeps
 * that it happened, not who it was.
 */
export async function removeRider(formData: FormData) {
  const { userId } = await requireAdmin();
  const back = (m: string, ok = false) => redirect(`/admin/riders?${ok ? "removed" : "error"}=${encodeURIComponent(m)}`);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (!isEmail(email)) back("That isn't an email address.");
  if (email !== confirm) back("The two addresses don't match.");
  const service = createServiceSupabase();
  if (!service) back("The service key isn't set.");

  const { data: profile } = await service!.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (!profile) back("No account has that email address.");
  if (profile!.role !== "rider") back("That's a professional's account. Remove their listing with them first.");
  const { data: admin } = await service!.from("admin_users").select("user_id").eq("user_id", profile!.id).maybeSingle();
  if (admin) back("That's an admin's account.");

  const { error } = await service!.auth.admin.deleteUser(profile!.id);
  if (error) back(error.message);
  await service!.from("change_log").insert({ table_name: "riders", row_id: profile!.id, label: "a rider, on request", op: "delete", changed_by: userId });
  revalidatePath("/admin/riders");
  back("Removed, with their alerts and saved profiles.", true);
}
