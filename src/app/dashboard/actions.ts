"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireCoach() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
}

const STATUSES = ["yes", "waitlist", "no"] as const;
export type TakingStudents = (typeof STATUSES)[number];

/** The "Taking new students?" segmented control on the overview. */
export async function setTakingStudents(value: TakingStudents) {
  if (!STATUSES.includes(value)) throw new Error("Unknown status.");
  const { supabase, userId } = await requireCoach();
  const { error } = await supabase
    .from("coach_profiles")
    .update({ taking_students: value, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/coaches/[slug]", "page");
  return { value };
}

const ORDER = ["new", "replied", "booked", "no_response"] as const;
export type EnquiryStatus = (typeof ORDER)[number];

/** Tap a status to change it — cycles New → Replied → Booked → No response. */
export async function cycleEnquiryStatus(id: string, current: EnquiryStatus) {
  const { supabase, userId } = await requireCoach();
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const { error } = await supabase
    .from("enquiries")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("coach_id", userId);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/enquiries");
  return { status: next };
}
