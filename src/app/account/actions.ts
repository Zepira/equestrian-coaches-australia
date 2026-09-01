"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";

async function requireRider() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  return { supabase, userId: user.id };
}

export async function removeFavourite(coachId: string) {
  const { supabase, userId } = await requireRider();

  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("rider_id", userId)
    .eq("coach_id", coachId);
  if (error) throw error;

  revalidatePath("/account");
}

export async function saveRiderPreferences(formData: FormData) {
  const { supabase, userId } = await requireRider();

  const area = String(formData.get("area") ?? "").trim();
  const disciplineIds = formData.getAll("discipline").map(String);

  const resolved = area ? await resolveLocation(supabase, area) : null;

  const { error } = await supabase.from("rider_preferences").upsert({
    rider_id: userId,
    suburb: resolved?.suburb ?? null,
    postcode: resolved?.postcode ?? null,
    ...(resolved ? { location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})` } : {}),
    followed_discipline_ids: disciplineIds,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  revalidatePath("/account");
}
