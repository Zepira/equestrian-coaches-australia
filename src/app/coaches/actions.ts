"use server";

import { createClient } from "@/lib/supabase/server";

// Toggles a favourite for the signed-in rider. Called directly from the
// FavouriteButton client component (server actions can be invoked from
// client components) — the RLS policy on `favourites` is the real
// enforcement either way, this just decides insert vs delete.
export async function toggleFavourite(coachId: string): Promise<{ favourited: boolean }> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: existing } = await supabase
    .from("favourites")
    .select("coach_id")
    .eq("rider_id", user.id)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("rider_id", user.id)
      .eq("coach_id", coachId);
    if (error) throw error;
    return { favourited: false };
  }

  const { error } = await supabase.from("favourites").insert({ rider_id: user.id, coach_id: coachId });
  if (error) throw error;
  return { favourited: true };
}
