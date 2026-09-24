"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/provider-session";

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
  revalidatePath("/coaches/[slug]", "page");
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
