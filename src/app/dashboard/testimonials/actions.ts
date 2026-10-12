"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/provider-session";
import { profilePath } from "@/lib/page-paths";
import { providerHasTools, TESTIMONIAL_LIMITS } from "@/lib/testimonials";

/**
 * Dashboard → Testimonials. Everything goes through the signed-in user's own
 * client, so the "members manage testimonials" policy keeps each provider to
 * their own rows; the 0021 trigger stops a client's words being rewritten.
 */
export type TestimonialFormState = { ok: boolean; message: string } | null;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

function read(fd: FormData): { quote: string; name: string; place: string } | string {
  const quote = String(fd.get("quote") ?? "").trim().replace(/\r\n/g, "\n");
  const name = clean(fd.get("author_name"));
  const place = clean(fd.get("author_place"));
  const L = TESTIMONIAL_LIMITS;
  if (!quote) return "Add the quote.";
  if (quote.length > L.quote) return `Keep the quote under ${L.quote} characters.`;
  if (!name || name.length > L.name) return "Add who it's from, as they'd like it shown.";
  if (place.length > L.place) return "Keep the town short, like Bendigo.";
  return { quote, name, place };
}

async function refresh(providerSlug: string | null | undefined) {
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/dashboard");
  if (providerSlug) revalidatePath(profilePath(providerSlug));
}

export async function addTestimonial(_prev: TestimonialFormState, fd: FormData): Promise<TestimonialFormState> {
  const { supabase, providerId, provider } = await requireProvider();
  const v = read(fd);
  if (typeof v === "string") return { ok: false, message: v };
  const { data: last } = await supabase.from("testimonials").select("sort_order").eq("provider_id", providerId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("testimonials").insert({
    provider_id: providerId,
    quote: v.quote,
    author_name: v.name,
    author_place: v.place,
    status: "shown",
    source: "added",
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { ok: false, message: "That didn't save. Try again in a minute." };
  await refresh(provider.slug);
  return { ok: true, message: "Added. It's on your profile now." };
}

/** Edits one the professional typed in. A client's own testimonial can't be edited. */
export async function editTestimonial(id: string, _prev: TestimonialFormState, fd: FormData): Promise<TestimonialFormState> {
  const { supabase, provider } = await requireProvider();
  const v = read(fd);
  if (typeof v === "string") return { ok: false, message: v };
  const { error } = await supabase.from("testimonials").update({ quote: v.quote, author_name: v.name, author_place: v.place }).eq("id", id).eq("source", "added");
  if (error) return { ok: false, message: "That didn't save. A testimonial a client wrote can't be edited." };
  await refresh(provider.slug);
  return { ok: true, message: "Saved." };
}

/** Show it on the profile, or hide it. A client's waiting testimonial is shown or hidden from here too. */
export async function setTestimonialShown(id: string, shown: boolean) {
  const { supabase, providerId, provider } = await requireProvider();
  const update: Record<string, unknown> = { status: shown ? "shown" : "declined" };
  if (!shown) update.pinned = false;
  if (shown) {
    // A newly shown one goes to the end of the list.
    const { data: last } = await supabase.from("testimonials").select("sort_order").eq("provider_id", providerId).eq("status", "shown").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    update.sort_order = (last?.sort_order ?? -1) + 1;
  }
  const { error } = await supabase.from("testimonials").update(update).eq("id", id);
  if (error) throw new Error("That didn't save. Try again.");
  await refresh(provider.slug);
}

/** Move a shown testimonial one place up or down, then renumber the list. */
export async function moveTestimonial(id: string, direction: "up" | "down") {
  const { supabase, providerId, provider } = await requireProvider();
  const { data } = await supabase.from("testimonials").select("id").eq("provider_id", providerId).eq("status", "shown").order("sort_order").order("created_at", { ascending: false });
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (const [n, rowId] of ids.entries()) await supabase.from("testimonials").update({ sort_order: n }).eq("id", rowId);
  await refresh(provider.slug);
}

/** Pin one to the top of the profile (plans with testimonial tools), or unpin it. */
export async function pinTestimonial(id: string, pin: boolean) {
  const { supabase, providerId, provider } = await requireProvider();
  if (pin && !(await providerHasTools(supabase, providerId))) throw new Error("Pinning is part of the plans with testimonial tools. Change plan in Billing to pin one.");
  // One pin at a time (a unique index says so): clear the old one first.
  await supabase.from("testimonials").update({ pinned: false }).eq("provider_id", providerId).eq("pinned", true);
  if (pin) {
    const { error } = await supabase.from("testimonials").update({ pinned: true }).eq("id", id).eq("status", "shown");
    if (error) throw new Error("That didn't pin. Try again.");
  }
  await refresh(provider.slug);
}

export async function deleteTestimonial(id: string) {
  const { supabase, provider } = await requireProvider();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw new Error("That didn't delete. Try again.");
  await refresh(provider.slug);
}
