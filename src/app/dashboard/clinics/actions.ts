"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyRidersOfClinic } from "@/lib/notifications";

async function requireClinicsTierCoach() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  // App-level check for a friendly error — the RLS policy on `clinics`
  // enforces the same rule at the DB level regardless, so this can't be
  // bypassed even if this check were skipped.
  if (coach?.subscription_tier !== "standard_plus_clinics" || coach?.subscription_status !== "active") {
    throw new Error("Clinics are only available on the Standard + Clinics plan.");
  }

  return { supabase, userId: user.id };
}

function readClinicFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    discipline_id: String(formData.get("discipline_id") ?? "") || null,
    location_text: String(formData.get("location_text") ?? "").trim(),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? "") || null,
  };
}

export async function createClinic(formData: FormData) {
  const { supabase, userId } = await requireClinicsTierCoach();
  const fields = readClinicFields(formData);
  if (!fields.title || !fields.start_date) throw new Error("Title and start date are required.");

  const { data: clinic, error } = await supabase
    .from("clinics")
    .insert({ coach_id: userId, ...fields })
    .select("id")
    .single();
  if (error) throw error;

  // Fire-and-forget from the caller's point of view — a slow/failed email
  // batch shouldn't stop the clinic from saving. Errors are logged inside.
  notifyRidersOfClinic(clinic.id).catch((err) =>
    console.error("notifyRidersOfClinic failed:", err)
  );

  revalidatePath("/dashboard/clinics");
  redirect("/dashboard/clinics");
}

export async function updateClinic(clinicId: string, formData: FormData) {
  const { supabase, userId } = await requireClinicsTierCoach();
  const fields = readClinicFields(formData);
  if (!fields.title || !fields.start_date) throw new Error("Title and start date are required.");

  const { error } = await supabase
    .from("clinics")
    .update(fields)
    .eq("id", clinicId)
    .eq("coach_id", userId);
  if (error) throw error;

  revalidatePath("/dashboard/clinics");
  redirect("/dashboard/clinics");
}

export async function deleteClinic(clinicId: string) {
  const { supabase, userId } = await requireClinicsTierCoach();

  const { error } = await supabase.from("clinics").delete().eq("id", clinicId).eq("coach_id", userId);
  if (error) throw error;

  revalidatePath("/dashboard/clinics");
}
