"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";

export async function removeFavourite(coachId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("rider_id", user.id)
    .eq("coach_id", coachId);
  if (error) throw error;

  revalidatePath("/account");
}

export async function saveRiderPreferences(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const area = String(formData.get("area") ?? "").trim();
  const disciplineIds = formData.getAll("discipline").map(String);

  const resolved = area ? await resolveLocation(supabase, area) : null;

  const { error } = await supabase.from("rider_preferences").upsert({
    rider_id: user.id,
    suburb: resolved?.suburb ?? null,
    postcode: resolved?.postcode ?? null,
    ...(resolved ? { location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})` } : {}),
    followed_discipline_ids: disciplineIds,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  revalidatePath("/account");
}
