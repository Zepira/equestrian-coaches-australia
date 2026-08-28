"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";

async function requireCoach() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  return { supabase, userId: user.id };
}

export async function saveProfile(formData: FormData) {
  const { supabase, userId } = await requireCoach();

  const headline = String(formData.get("headline") ?? "");
  const bio = String(formData.get("bio") ?? "");
  const suburb = String(formData.get("suburb") ?? "");
  const state = String(formData.get("state") ?? "");
  const postcode = String(formData.get("postcode") ?? "");
  const qualifications = String(formData.get("qualifications") ?? "")
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  const disciplineIds = formData.getAll("discipline").map(String);
  const skillIds = formData.getAll("skill").map(String);
  const attributeIds = formData.getAll("attribute").map(String);

  // Geocode suburb/state/postcode into a point so radius search (phase 4)
  // can find this coach. Silently skipped if it doesn't resolve — the
  // profile still saves, it just won't surface in "near me" searches yet.
  const resolved = await resolveLocation(supabase, `${suburb} ${postcode || state}`.trim());

  const { error } = await supabase
    .from("coach_profiles")
    .update({
      headline,
      bio,
      suburb,
      state,
      postcode,
      qualifications,
      ...(resolved
        ? {
            location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})`,
            area_id: resolved.area_id,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;

  // Replace the whole term set (disciplines + skills + attributes)
  // wholesale — simplest correct approach for a small, infrequently-
  // changed list. Disciplines keep their checked order as sort_order, so
  // the first one ticked leads the coach's page title (spec: "lowest-
  // ordered discipline is primary" — full drag-to-reorder is a follow-up).
  const { error: deleteError } = await supabase.from("coach_terms").delete().eq("coach_id", userId);
  if (deleteError) throw deleteError;

  const termRows = [
    ...disciplineIds.map((term_id, sort_order) => ({ coach_id: userId, term_id, sort_order })),
    ...skillIds.map((term_id) => ({ coach_id: userId, term_id, sort_order: 0 })),
    ...attributeIds.map((term_id) => ({ coach_id: userId, term_id, sort_order: 0 })),
  ];
  if (termRows.length > 0) {
    const { error: insertError } = await supabase.from("coach_terms").insert(termRows);
    if (insertError) throw insertError;
  }

  revalidatePath("/dashboard/profile");
}

export async function uploadPhoto(formData: FormData) {
  const { supabase, userId } = await requireCoach();

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("coach-photos")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { count } = await supabase
    .from("coach_photos")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", userId);

  const { error: insertError } = await supabase
    .from("coach_photos")
    .insert({ coach_id: userId, storage_path: path, sort_order: count ?? 0 });
  if (insertError) throw insertError;

  revalidatePath("/dashboard/profile");
}

export async function deletePhoto(photoId: string, storagePath: string) {
  const { supabase, userId } = await requireCoach();

  await supabase.storage.from("coach-photos").remove([storagePath]);
  const { error } = await supabase
    .from("coach_photos")
    .delete()
    .eq("id", photoId)
    .eq("coach_id", userId);
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}

export async function addTestimonial(formData: FormData) {
  const { supabase, userId } = await requireCoach();

  const authorName = String(formData.get("author_name") ?? "").trim();
  const quote = String(formData.get("quote") ?? "").trim();
  if (!authorName || !quote) throw new Error("Both fields are required.");

  const { error } = await supabase
    .from("testimonials")
    .insert({ coach_id: userId, author_name: authorName, quote });
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}

export async function deleteTestimonial(id: string) {
  const { supabase, userId } = await requireCoach();

  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", id)
    .eq("coach_id", userId);
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}
