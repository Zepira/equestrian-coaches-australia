"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveLocation } from "@/lib/supabase/queries";
import { titleCase } from "@/lib/text";
import { headers } from "next/headers";
import { consentStatus, ensureContact, recordConsent } from "@/lib/audience";
import { createServiceSupabase } from "@/lib/supabase/service";

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
    .eq("provider_id", coachId);
  if (error) throw error;

  revalidatePath("/account");
}

const RADII = [25, 50, 100, 200];

/**
 * The consent record for an alert (The Marketing Engine M1): a new alert is
 * an express request for alert emails, under the words the form showed; the
 * round-up is its own unticked box. Written with the service role, since
 * consents are admin-read and insert-only.
 */
async function recordAlertConsent(userId: string, formData: FormData, source: string) {
  const service = createServiceSupabase();
  if (!service) return;
  const { data: profile } = await service.from("profiles").select("email").eq("id", userId).single();
  if (!profile?.email) return;
  const contact = await ensureContact(service, profile.email as string, { profileId: userId });
  const status = await consentStatus(service, contact.id);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const alertsWording = String(formData.get("alerts_wording") ?? "") || null;
  const newsWording = String(formData.get("news_wording") ?? "") || null;
  if (!status.rider_alerts && source !== "edit") {
    await recordConsent(service, { contactId: contact.id, purpose: "rider_alerts", action: "grant", type: "express", wordingId: alertsWording, source: `alert:${source}`, ip });
  }
  if (newsWording && !status.rider_news) {
    await recordConsent(service, { contactId: contact.id, purpose: "rider_news", action: "grant", type: "express", wordingId: newsWording, source: `alert:${source}`, ip });
  }
}

async function requireRider() {
  const supabase = await createServerClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
}

/**
 * Create or edit one alert (The Site as a CMS §07.1): a place and radius,
 * who (everyone, a door, or one profession), optional disciplines or
 * specialities of that profession, and what to hear about. A new alert
 * records when and where the rider opted in (consent_source: the account
 * page, or the "notify me" link on a search).
 */
export async function saveAlert(formData: FormData) {
  const { supabase, userId } = await requireRider();
  const id = String(formData.get("id") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  const resolved = place ? await resolveLocation(supabase, place) : null;
  if (!resolved) redirect(`/account?alert_error=${encodeURIComponent(place ? `We couldn't find "${place}". Try a suburb and state, or a postcode.` : "Add the place you want to hear about.")}#alerts`);

  const radius = Number(formData.get("radius_km"));
  const who = String(formData.get("who") ?? "");
  const wantsEvents = formData.get("wants_events") === "on";
  const wantsNew = formData.get("wants_new_providers") === "on";
  if (!wantsEvents && !wantsNew) redirect(`/account?alert_error=${encodeURIComponent("Tick at least one thing to hear about.")}#alerts`);

  let door: string | null = null;
  let professionIds: string[] = [];
  let termIds: string[] = [];
  if (who.startsWith("door:")) door = who.slice(5);
  if (who.startsWith("p:")) {
    const professionId = who.slice(2);
    professionIds = [professionId];
    // Only terms that belong to that profession.
    const picked = formData.getAll("term").map(String);
    if (picked.length) {
      const { data } = await supabase.from("terms").select("id").eq("parent_id", professionId).in("id", picked);
      termIds = (data ?? []).map((t) => t.id as string);
    }
  }

  const now = new Date().toISOString();
  const fields = {
    suburb: titleCase(resolved.suburb),
    postcode: resolved.postcode,
    location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})`,
    radius_km: RADII.includes(radius) ? radius : 100,
    door,
    profession_ids: professionIds,
    term_ids: termIds,
    wants_events: wantsEvents,
    wants_new_providers: wantsNew,
    updated_at: now,
  };
  const { error } = id
    ? await supabase.from("rider_alerts").update(fields).eq("id", id).eq("rider_id", userId)
    : await supabase.from("rider_alerts").insert({
        rider_id: userId,
        ...fields,
        consent_source: String(formData.get("source") ?? "") === "search" ? "search" : "account",
        consented_at: now,
      });
  if (error) throw error;
  await recordAlertConsent(userId, formData, id ? "edit" : String(formData.get("source") ?? "") === "search" ? "search" : "account");
  revalidatePath("/account");
  redirect("/account?saved=1#alerts");
}

export async function deleteAlert(id: string) {
  const { supabase, userId } = await requireRider();
  const { error } = await supabase.from("rider_alerts").delete().eq("id", id).eq("rider_id", userId);
  if (error) throw error;
  revalidatePath("/account");
}

/** Pause or resume. Resuming is a fresh opt-in, so it records new consent. */
export async function setAlertActive(id: string, active: boolean) {
  const { supabase, userId } = await requireRider();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("rider_alerts")
    .update(active ? { unsubscribed_at: null, consented_at: now, consent_source: "account", updated_at: now } : { unsubscribed_at: now, updated_at: now })
    .eq("id", id)
    .eq("rider_id", userId);
  if (error) throw error;
  if (active) {
    const fd = new FormData();
    const service = createServiceSupabase();
    const w = service ? await service.from("consent_wordings").select("id").eq("purpose", "rider_alerts").order("version", { ascending: false }).limit(1).maybeSingle() : null;
    if (w?.data) fd.set("alerts_wording", w.data.id as string);
    await recordAlertConsent(userId, fd, "resume");
  }
  revalidatePath("/account");
}

/**
 * The one destructive action on the rider account. Reached only from
 * /account/delete, which requires the rider to type DELETE — the action
 * re-checks that word server-side so a stray POST can't do it. Deletes the
 * auth user via the service role; every rider row (favourites, alerts,
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
  // Enquiries the rider sent stay with the provider (rider_id set null via FK).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
