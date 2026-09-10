"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyRidersOfClinic } from "@/lib/notifications";
import { canListClinics, clinicLimit } from "@/lib/tiers";

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
  // enforces "active paid plan" at the DB level regardless. Listed is
  // capped at one live event (CLAUDE.md tiers); the cap is app-level.
  if (!canListClinics(coach?.subscription_tier, coach?.subscription_status)) {
    throw new Error("Clinics are available on every paid plan — subscribe in Billing to list one.");
  }

  return { supabase, userId: user.id, limit: clinicLimit(coach?.subscription_tier) };
}

function readClinicFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    discipline_id: String(formData.get("discipline_id") ?? "") || null,
    location_text: String(formData.get("location_text") ?? "").trim(),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? "") || null,
    ...(() => {
      const raw = String(formData.get("capacity") ?? "").replace(/[^\d]/g, "");
      const capacity = raw === "" ? null : Math.max(0, Number(raw));
      return { capacity, places_left: capacity };
    })(),
  };
}

export async function createClinic(formData: FormData) {
  const { supabase, userId, limit } = await requireClinicsTierCoach();
  if (Number.isFinite(limit)) {
    const { count } = await supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", userId)
      .gte("start_date", new Date().toISOString().slice(0, 10));
    if ((count ?? 0) >= limit) {
      throw new Error(`Listed includes ${limit} live clinic at a time — move up to Spotlight or Clinic for more.`);
    }
  }
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
