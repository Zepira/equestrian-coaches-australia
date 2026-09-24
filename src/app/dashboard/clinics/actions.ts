"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/provider-session";
import { getCoachingId } from "@/lib/supabase/queries";
import { notifyRidersOfClinic } from "@/lib/notifications";
import { canListClinics, clinicLimit, isTier } from "@/lib/tiers";
import { getPlanCapabilities, getPlans } from "@/lib/settings";

async function requireClinicsTierCoach() {
  const { supabase, providerId } = await requireProvider();
  const { data: sub } = await supabase.from("subscriptions").select("tier, status").eq("provider_id", providerId).maybeSingle();

  // App-level check for a friendly error; the RLS policy on `events` enforces
  // "live paid plan" at the DB level regardless. Listed is capped at one live
  // event (CLAUDE.md tiers); the cap is app-level.
  if (!canListClinics(sub?.tier, sub?.status)) {
    throw new Error("Clinics are available on every paid plan. Subscribe in Billing to list one.");
  }

  return { supabase, providerId, limit: clinicLimit(sub?.tier, await getPlanCapabilities()) };
}

function readClinicFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    term_id: String(formData.get("discipline_id") ?? "") || null,
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
  const { supabase, providerId, limit } = await requireClinicsTierCoach();
  if (Number.isFinite(limit)) {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId)
      .gte("start_date", new Date().toISOString().slice(0, 10));
    if ((count ?? 0) >= limit) {
      const plans = await getPlans();
      const { data: sub } = await supabase.from("subscriptions").select("tier").eq("provider_id", providerId).maybeSingle();
      const name = isTier(sub?.tier) ? plans[sub.tier].name : "Your plan";
      throw new Error(`${name} includes ${limit} live clinic${limit === 1 ? "" : "s"} at a time. Move up to ${plans.spotlight.name} or ${plans.clinic.name} for more.`);
    }
  }
  const fields = readClinicFields(formData);
  if (!fields.title || !fields.start_date) throw new Error("Title and start date are required.");

  const { data: clinic, error } = await supabase
    .from("events")
    // Events from the coach dashboard are coaching events; the profession is
    // what rider alerts match on.
    .insert({ provider_id: providerId, profession_id: await getCoachingId(supabase), ...fields })
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
  const { supabase, providerId } = await requireClinicsTierCoach();
  const fields = readClinicFields(formData);
  if (!fields.title || !fields.start_date) throw new Error("Title and start date are required.");

  const { error } = await supabase
    .from("events")
    .update(fields)
    .eq("id", clinicId)
    .eq("provider_id", providerId);
  if (error) throw error;

  revalidatePath("/dashboard/clinics");
  redirect("/dashboard/clinics");
}

export async function deleteClinic(clinicId: string) {
  const { supabase, providerId } = await requireClinicsTierCoach();

  const { error } = await supabase.from("events").delete().eq("id", clinicId).eq("provider_id", providerId);
  if (error) throw error;

  revalidatePath("/dashboard/clinics");
}
