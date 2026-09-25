"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { ensureContact, recordConsent } from "@/lib/audience";

const STATUSES = ["yes", "waitlist", "no"] as const;
export type TakingStudents = (typeof STATUSES)[number];

/** The "Taking new students?" segmented control on the overview. */
export async function setTakingStudents(value: TakingStudents) {
  if (!STATUSES.includes(value)) throw new Error("Unknown status.");
  const { supabase, providerId } = await requireProvider();
  const { error } = await supabase
    .from("providers")
    .update({ availability: value, updated_at: new Date().toISOString() })
    .eq("id", providerId);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/profile/[slug]", "page");
  return { value };
}

const ORDER = ["new", "replied", "booked", "no_response"] as const;
export type EnquiryStatus = (typeof ORDER)[number];

/** Tap a status to change it — cycles New → Replied → Booked → No response. */
export async function cycleEnquiryStatus(id: string, current: EnquiryStatus) {
  const { supabase, providerId } = await requireProvider();
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const { error } = await supabase
    .from("enquiries")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("provider_id", providerId);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/enquiries");
  return { status: next };
}

/**
 * "Email me my monthly numbers" (The Marketing Engine M1): the monthly
 * numbers email is treated as marketing, so it goes only to professionals
 * who ask for it. Records consent under the words the button showed.
 */
export async function optInToNumbers(fd: FormData) {
  const { userId } = await requireProvider();
  const service = createServiceSupabase();
  if (!service) return;
  const { data: profile } = await service.from("profiles").select("email").eq("id", userId).single();
  if (!profile?.email) return;
  const contact = await ensureContact(service, profile.email as string, { profileId: userId });
  const wording = String(fd.get("wording") ?? "") || null;
  const h = await headers();
  await recordConsent(service, { contactId: contact.id, purpose: "provider_news", action: "grant", type: "express", wordingId: wording, source: "dashboard", ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null });
  await service.from("suppressions").delete().eq("email", profile.email as string).eq("reason", "unsubscribe_all");
  revalidatePath("/dashboard");
}
