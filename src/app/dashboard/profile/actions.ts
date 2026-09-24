"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/provider-session";
import { PROVIDER_PHOTOS, PROVIDER_VIDEOS, resolveLocation } from "@/lib/supabase/queries";
import { hasVideo } from "@/lib/tiers";
import { getPlanCapabilities, getPlans } from "@/lib/settings";
import { TIERS } from "@/lib/tiers";
import { logChange } from "@/lib/provider-lifecycle";

// Video is a plan perk: which plans is the plan_capabilities setting.
async function requireVideoTierCoach() {
  const { supabase, providerId, provider } = await requireProvider();
  const { data: sub } = await supabase.from("subscriptions").select("tier, status").eq("provider_id", providerId).maybeSingle();

  const caps = await getPlanCapabilities();
  if (!hasVideo(sub?.tier, sub?.status, caps)) {
    const plans = await getPlans();
    const names = TIERS.filter((t) => caps[t].video).map((t) => plans[t].name);
    throw new Error(`Intro video is included on ${names.join(" and ")}. Change plan in Billing to add one.`);
  }

  return { supabase, providerId, existingVideoPath: (provider.video_storage_path as string | null) ?? null };
}

export async function saveProfile(formData: FormData) {
  const { supabase, providerId } = await requireProvider();

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
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const facebookUrl = String(formData.get("facebook_url") ?? "").trim();
  const showContactEmail = formData.get("show_contact_email") === "on";
  const showContactPhone = formData.get("show_contact_phone") === "on";
  const showFacebook = formData.get("show_facebook") === "on";
  const showContactForm = formData.get("show_contact_form") === "on";
  const travelRadiusRaw = String(formData.get("travel_radius_km") ?? "").replace(/[^\d]/g, "");
  const travelRadiusKm = travelRadiusRaw === "" ? null : Math.min(1000, Math.max(0, Number(travelRadiusRaw)));
  const yearsRaw = String(formData.get("years_experience") ?? "").replace(/[^\d]/g, "");
  const yearsCoaching = yearsRaw === "" ? null : Math.min(80, Math.max(0, Number(yearsRaw)));

  // Geocode suburb/state/postcode into a point so radius search (phase 4)
  // can find this coach. Silently skipped if it doesn't resolve — the
  // profile still saves, it just won't surface in "near me" searches yet.
  const resolved = await resolveLocation(supabase, `${suburb} ${postcode || state}`.trim());

  const { error } = await supabase
    .from("providers")
    .update({
      headline,
      bio,
      suburb,
      state,
      postcode,
      qualifications,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      facebook_url: facebookUrl,
      show_contact_email: showContactEmail && Boolean(contactEmail),
      show_contact_phone: showContactPhone && Boolean(contactPhone),
      show_facebook: showFacebook && Boolean(facebookUrl),
      show_contact_form: showContactForm,
      travel_radius_km: travelRadiusKm,
      travels_to_client: (travelRadiusKm ?? 0) > 0,
      years_experience: yearsCoaching,
      ...(resolved
        ? {
            location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})`,
            lat: resolved.lat,
            long: resolved.long,
            area_id: resolved.area_id,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  if (error) throw error;

  // Replace the whole term set (disciplines + skills + attributes)
  // wholesale — simplest correct approach for a small, infrequently-
  // changed list. Disciplines keep their checked order as sort_order, so
  // the first one ticked leads the coach's page title (spec: "lowest-
  // ordered discipline is primary" — full drag-to-reorder is a follow-up).
  // The profession rows are provider_terms too: keep them, or saving the
  // form would take the provider out of their own profession.
  const { data: professionRows } = await supabase
    .from("provider_terms")
    .select("term_id, terms!inner(kind)")
    .eq("provider_id", providerId)
    .eq("terms.kind", "profession");
  const keep = (professionRows ?? []).map((r) => r.term_id as string);
  let del = supabase.from("provider_terms").delete().eq("provider_id", providerId);
  if (keep.length) del = del.not("term_id", "in", `(${keep.join(",")})`);
  const { error: deleteError } = await del;
  if (deleteError) throw deleteError;

  const termRows = [
    ...disciplineIds.map((term_id, sort_order) => ({ provider_id: providerId, term_id, sort_order })),
    ...skillIds.map((term_id) => ({ provider_id: providerId, term_id, sort_order: 0 })),
    ...attributeIds.map((term_id) => ({ provider_id: providerId, term_id, sort_order: 0 })),
  ];
  if (termRows.length > 0) {
    const { error: insertError } = await supabase.from("provider_terms").insert(termRows);
    if (insertError) throw insertError;
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}

export async function uploadPhoto(formData: FormData) {
  const { supabase, providerId, userId } = await requireProvider();

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${providerId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PROVIDER_PHOTOS)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { count } = await supabase
    .from("provider_photos")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId);

  const { error: insertError } = await supabase
    .from("provider_photos")
    .insert({ provider_id: providerId, storage_path: path, sort_order: count ?? 0 });
  if (insertError) throw insertError;

  // A live profile's photos change without another review; admin sees it in "recent changes".
  await logChange(supabase, providerId, userId, "photo added", null, path);
  revalidatePath("/dashboard/profile");
  revalidatePath("/onboarding");
}

export async function deletePhoto(photoId: string, storagePath: string) {
  const { supabase, providerId, userId } = await requireProvider();

  await supabase.storage.from(PROVIDER_PHOTOS).remove([storagePath]);
  const { error } = await supabase
    .from("provider_photos")
    .delete()
    .eq("id", photoId)
    .eq("provider_id", providerId);
  if (error) throw error;

  await logChange(supabase, providerId, userId, "photo removed", storagePath, null);
  revalidatePath("/dashboard/profile");
  revalidatePath("/onboarding");
}

export async function uploadVideo(formData: FormData) {
  const { supabase, providerId, existingVideoPath } = await requireVideoTierCoach();

  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  // One video per coach — replace, don't accumulate. Remove the old object
  // first so a re-upload never leaves an orphaned file behind in storage.
  if (existingVideoPath) {
    await supabase.storage.from(PROVIDER_VIDEOS).remove([existingVideoPath]);
  }

  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `${providerId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PROVIDER_VIDEOS)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(PROVIDER_VIDEOS).getPublicUrl(path);

  const { error } = await supabase
    .from("providers")
    .update({ video_url: publicUrl.publicUrl, video_storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", providerId);
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}

export async function deleteVideo() {
  const { supabase, providerId } = await requireProvider();

  const { data: coach } = await supabase
    .from("providers")
    .select("video_storage_path")
    .eq("id", providerId)
    .maybeSingle();

  if (coach?.video_storage_path) {
    await supabase.storage.from(PROVIDER_VIDEOS).remove([coach.video_storage_path]);
  }

  const { error } = await supabase
    .from("providers")
    .update({ video_url: null, video_storage_path: null, updated_at: new Date().toISOString() })
    .eq("id", providerId);
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}

export async function addTestimonial(formData: FormData) {
  const { supabase, providerId } = await requireProvider();

  const authorName = String(formData.get("author_name") ?? "").trim();
  const quote = String(formData.get("quote") ?? "").trim();
  if (!authorName || !quote) throw new Error("Both fields are required.");

  const { error } = await supabase
    .from("testimonials")
    .insert({ provider_id: providerId, author_name: authorName, quote });
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}

export async function deleteTestimonial(id: string) {
  const { supabase, providerId } = await requireProvider();

  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", id)
    .eq("provider_id", providerId);
  if (error) throw error;

  revalidatePath("/dashboard/profile");
}
