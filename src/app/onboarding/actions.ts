"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { resolveLocation } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { isReviewRequired } from "@/lib/settings";
import { isComplete, logChange, profileChecklist, submitForReview } from "@/lib/provider-lifecycle";
import { titleCase } from "@/lib/text";

/**
 * Onboarding's saves (The Site as a CMS §06.3). Each step's form saves as it
 * goes (AutosaveForm calls these on every pause in typing), so leaving half
 * way leaves a draft. Every write goes through the member's own client and
 * RLS; status is never touched here except by submitProfile, through the
 * service role, after the checklist passes.
 */
/** ok: saved. warn: saved, but something needs their attention (a place we couldn't find). */
export type SaveResult = { ok: boolean; message?: string; warn?: boolean };

const text = (fd: FormData, key: string, max = 2000) => String(fd.get(key) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const wholeNumber = (fd: FormData, key: string, max: number) => {
  const raw = String(fd.get(key) ?? "").replace(/[^\d]/g, "");
  return raw === "" ? null : Math.min(max, Number(raw));
};

function done() {
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true } as SaveResult;
}

/** Step 1: the profession, a second one ("I also do…"), and the first profession's specialities. */
export async function saveWhat(fd: FormData): Promise<SaveResult> {
  const { supabase, providerId } = await requireProvider();
  const professions = (await getProfessions()).filter((p) => p.launchState !== "draft" && p.id);
  const primary = professions.find((p) => p.slug === fd.get("profession"));
  if (!primary) return { ok: false, message: "Pick what you do." };
  const second = professions.find((p) => p.slug === fd.get("second") && p.slug !== primary.slug);
  const termIds = fd.getAll("term").map(String);

  const { data: rows } = await supabase.from("provider_terms").select("term_id, terms(kind, parent_id)").eq("provider_id", providerId);
  const held = new Set([primary.id, second?.id].filter(Boolean) as string[]);
  const drop = (rows ?? [])
    .filter((r) => {
      const t = (r as unknown as { terms: { kind: string; parent_id: string | null } | null }).terms;
      if (!t) return false;
      if (t.kind === "profession") return true; // rewritten below, in order
      // This step owns the primary profession's specialities; a profession
      // no longer held takes its specialities with it.
      return t.kind === "discipline" && (t.parent_id === primary.id || !held.has(t.parent_id ?? ""));
    })
    .map((r) => r.term_id as string);
  if (drop.length) {
    const { error } = await supabase.from("provider_terms").delete().eq("provider_id", providerId).in("term_id", drop);
    if (error) return { ok: false, message: error.message };
  }

  const { data: allowed } = await supabase.from("terms").select("id").eq("kind", "discipline").eq("parent_id", primary.id).in("id", termIds.length ? termIds : ["00000000-0000-0000-0000-000000000000"]);
  const valid = new Set((allowed ?? []).map((t) => t.id as string));
  const insert = [
    { provider_id: providerId, term_id: primary.id!, sort_order: 0 },
    ...(second ? [{ provider_id: providerId, term_id: second.id!, sort_order: 1 }] : []),
    ...termIds.filter((id) => valid.has(id)).map((term_id, i) => ({ provider_id: providerId, term_id, sort_order: i })),
  ];
  const { error } = await supabase.from("provider_terms").insert(insert);
  if (error) return { ok: false, message: error.message };
  return done();
}

/** Step 2: base, travel, remote, business name. */
export async function saveWhere(fd: FormData): Promise<SaveResult> {
  const { supabase, providerId } = await requireProvider();
  const place = text(fd, "place", 120);
  const travels = fd.get("travels") === "on";
  const resolved = place ? await resolveLocation(supabase, place) : null;
  const { error } = await supabase
    .from("providers")
    .update({
      travels_to_client: travels,
      travel_radius_km: travels ? wholeNumber(fd, "travel_radius_km", 1000) : null,
      remote: fd.get("remote") === "on",
      business_name: text(fd, "business_name", 120) || null,
      ...(resolved
        ? {
            suburb: titleCase(resolved.suburb),
            state: resolved.state,
            postcode: resolved.postcode,
            location: `SRID=4326;POINT(${resolved.long} ${resolved.lat})`,
            lat: resolved.lat,
            long: resolved.long,
            area_id: resolved.area_id,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  if (error) return { ok: false, message: error.message };
  done();
  if (place && !resolved) return { ok: true, warn: true, message: `We couldn't find "${place}". Try the suburb and state, or a postcode.` };
  return { ok: true, message: resolved ? `Based in ${titleCase(resolved.suburb)} ${resolved.state} ${resolved.postcode}` : undefined };
}

/** Step 3: name, headline, bio, qualifications, years. The photo uploads on its own. */
export async function saveYou(fd: FormData): Promise<SaveResult> {
  const { supabase, providerId, userId, provider } = await requireProvider();
  const name = text(fd, "name", 80);
  if (!name) return { ok: false, message: "Your name can't be empty." };
  if (name !== provider.name) await logChange(supabase, providerId, userId, "name", provider.name, name);
  const { error } = await supabase
    .from("providers")
    .update({
      name,
      headline: text(fd, "headline", 120),
      bio: text(fd, "bio", 3000),
      qualifications: text(fd, "qualifications", 2000).split("\n").map((q) => q.trim()).filter(Boolean),
      years_experience: wholeNumber(fd, "years_experience", 80),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  if (error) return { ok: false, message: error.message };
  return done();
}

/** Step 4: the enquiry form, phone and email, each switched on or off. */
export async function saveContact(fd: FormData): Promise<SaveResult> {
  const { supabase, providerId } = await requireProvider();
  const phone = text(fd, "contact_phone", 40);
  const email = text(fd, "contact_email", 120);
  const { error } = await supabase
    .from("providers")
    .update({
      show_contact_form: fd.get("show_contact_form") === "on",
      contact_phone: phone,
      show_contact_phone: fd.get("show_contact_phone") === "on" && Boolean(phone),
      contact_email: email,
      show_contact_email: fd.get("show_contact_email") === "on" && Boolean(email),
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  if (error) return { ok: false, message: error.message };
  return done();
}

/** Preview → submit: the checklist must pass; then review (or straight live when review is off). */
export async function submitProfile() {
  const { supabase, providerId, provider } = await requireProvider();
  if (!["draft", "changes_requested"].includes(String(provider.status))) redirect("/onboarding?step=preview");
  if (!isComplete(await profileChecklist(supabase, providerId))) redirect("/onboarding?step=preview&incomplete=1");
  const service = createServiceSupabase();
  if (!service) throw new Error("Submitting needs SUPABASE_SERVICE_ROLE_KEY.");
  const outcome = await submitForReview(service, providerId, await isReviewRequired());
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect(`/onboarding?step=preview&submitted=${outcome}`);
}
