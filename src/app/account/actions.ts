"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";

export async function removeFavourite(coachId: string) {
  const supabase = await createServerClient();
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
  const supabase = await createServerClient();
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
  redirect("/account?saved=1");
}

/**
 * The one destructive action on the rider account. Reached only from
 * /account/delete, which requires the rider to type DELETE — the action
 * re-checks that word server-side so a stray POST can't do it. Deletes the
 * auth user via the service role; every rider row (favourites, preferences,
 * notifications_log, profile) cascades from profiles.
 */
export async function deleteAccount(formData: FormData) {
  const supabase = await createServerClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect("/account/delete?error=confirm");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Service role key missing.");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  // Enquiries the rider sent stay with the coach (rider_id → null via FK).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
