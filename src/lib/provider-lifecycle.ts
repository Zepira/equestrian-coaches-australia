import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getProfessions } from "@/lib/cms/read";
import { getAreaPageMinProviders, getReviewAlertEmails } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath, sectionPath, termPath } from "@/lib/page-paths";
import { isLiveStatus } from "@/lib/tiers";
import { notifyRidersOfProvider } from "@/lib/rider-email";

/**
 * A provider's way from sign-up to live (The Site as a CMS §06.4–5):
 * draft → in_review → published (or changes_requested and back), and
 * published ⇄ hidden as their plan lapses and resumes.
 *
 * Status changes only happen here, through the service role: a database
 * trigger stops a signed-in member from setting their own status
 * (0004_signup_review.sql), so review can't be skipped from the browser.
 */

export type Checklist = { photo: boolean; bio: boolean; speciality: boolean; location: boolean; plan: boolean };

/** The finished-profile minimum, plus a live plan (founding card saved counts). */
export async function profileChecklist(supabase: SupabaseClient, providerId: string): Promise<Checklist> {
  const [{ data: provider }, { count: photos }, { data: terms }, { data: sub }] = await Promise.all([
    supabase.from("providers").select("bio, lat").eq("id", providerId).single(),
    supabase.from("provider_photos").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
    supabase.from("provider_terms").select("terms(kind)").eq("provider_id", providerId),
    supabase.from("subscriptions").select("status").eq("provider_id", providerId).maybeSingle(),
  ]);
  return {
    photo: (photos ?? 0) > 0,
    bio: String(provider?.bio ?? "").trim().length >= 40,
    speciality: (terms ?? []).some((t) => (t as unknown as { terms: { kind: string } | null }).terms?.kind === "discipline"),
    location: provider?.lat != null,
    plan: isLiveStatus(sub?.status),
  };
}

export const isComplete = (c: Checklist) => c.photo && c.bio && c.speciality && c.location && c.plan;

type ProviderSummary = { id: string; slug: string; name: string; suburb: string; state: string; professionName: string; professionSlug: string; termSlugs: string[] };

async function summary(service: SupabaseClient, providerId: string): Promise<ProviderSummary | null> {
  const { data } = await service
    .from("providers")
    .select("id, slug, name, suburb, state, provider_terms(sort_order, terms(slug, kind, parent_id))")
    .eq("id", providerId)
    .single();
  if (!data) return null;
  const rows = ((data as unknown as { provider_terms: { sort_order: number; terms: { slug: string; kind: string; parent_id: string | null } | null }[] }).provider_terms ?? [])
    .filter((r) => r.terms)
    .sort((a, b) => a.sort_order - b.sort_order);
  const professionSlug = rows.find((r) => r.terms!.kind === "profession")?.terms!.slug ?? "coaches";
  const profession = (await getProfessions()).find((p) => p.slug === professionSlug);
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    suburb: data.suburb,
    state: data.state,
    professionName: profession?.singular ?? "professional",
    professionSlug,
    termSlugs: rows.filter((r) => r.terms!.kind === "discipline" && r.terms!.parent_id === profession?.id).map((r) => r.terms!.slug),
  };
}

async function providerEmails(service: SupabaseClient, providerId: string): Promise<string[]> {
  const { data } = await service.from("provider_members").select("profiles(email)").eq("provider_id", providerId);
  return (data ?? []).map((m) => (m as unknown as { profiles: { email: string | null } | null }).profiles?.email ?? "").filter(Boolean);
}

/** Submit (§06.4): into the review queue, or straight live when review is off. */
export async function submitForReview(service: SupabaseClient, providerId: string, reviewRequired: boolean) {
  const now = new Date().toISOString();
  const s = await summary(service, providerId);
  const reviewers = await getReviewAlertEmails();
  if (!reviewRequired) {
    await publish(service, providerId, null);
    if (s) {
      await sendEmail({
        to: reviewers,
        subject: `New ${s.professionName} live: ${s.name}`,
        text: `${s.name} (${s.professionName}, ${s.suburb} ${s.state}) finished their profile and it went live, since review is switched off.\n\n${absoluteUrl(profilePath(s.slug))}`,
      });
    }
    return "published" as const;
  }
  const { error } = await service
    .from("providers")
    .update({ status: "in_review", submitted_at: now, review_note: null, updated_at: now })
    .eq("id", providerId);
  if (error) throw error;
  if (s) {
    await sendEmail({
      to: reviewers,
      subject: `To review: ${s.name}, ${s.professionName} in ${s.suburb}`,
      text: `${s.name} has finished a ${s.professionName} profile (${s.suburb} ${s.state}) and it's waiting for a look.\n\nOpen the review queue: ${absoluteUrl("/admin/review")}`,
    });
  }
  revalidatePath("/admin/review");
  return "in_review" as const;
}

/** Publish, and tell the provider every page they now appear on (the fallback-ladder promise). */
export async function publish(service: SupabaseClient, providerId: string, reviewerId: string | null) {
  const now = new Date().toISOString();
  const { error } = await service
    .from("providers")
    .update({ status: "published", published_at: now, reviewed_by: reviewerId, reviewed_at: reviewerId ? now : null, review_note: null, updated_at: now })
    .eq("id", providerId);
  if (error) throw error;
  await service.rpc("recompute_indexable_pages", { p_min_providers: await getAreaPageMinProviders() });

  // Riders who asked to hear when someone like this starts near them (§07.1).
  await notifyRidersOfProvider(service, providerId);

  const s = await summary(service, providerId);
  if (s) {
    const pages = [
      `Your profile: ${absoluteUrl(profilePath(s.slug))}`,
      `The ${s.professionSlug} page: ${absoluteUrl(sectionPath(s.professionSlug))}`,
      ...s.termSlugs.map((t) => absoluteUrl(termPath(s.professionSlug, t))),
    ];
    await sendEmail({
      to: await providerEmails(service, providerId),
      subject: "Your profile is live",
      text: `Hi ${s.name.split(" ")[0]},\n\nYour profile is live. You can be found here:\n\n${pages.join("\n")}\n\nand in search whenever someone looks near ${s.suburb}.\n\nEquine Professionals Australia`,
    });
  }
  revalidatePath(profilePath(s?.slug ?? ""));
  revalidatePath("/admin/review");
}

/** Ask for changes, with a note the provider sees on their dashboard and in onboarding. */
export async function requestChanges(service: SupabaseClient, providerId: string, reviewerId: string, note: string) {
  const now = new Date().toISOString();
  const { error } = await service
    .from("providers")
    .update({ status: "changes_requested", review_note: note, reviewed_by: reviewerId, reviewed_at: now, updated_at: now })
    .eq("id", providerId);
  if (error) throw error;
  const s = await summary(service, providerId);
  if (s) {
    await sendEmail({
      to: await providerEmails(service, providerId),
      subject: "A couple of changes before your profile goes live",
      text: `Hi ${s.name.split(" ")[0]},\n\nWe had a look at your profile. Before it goes live:\n\n${note}\n\nMake the changes and send it again from here: ${absoluteUrl("/onboarding?step=preview")}\n\nEquine Professionals Australia`,
    });
  }
  revalidatePath("/admin/review");
}

/**
 * The plan decides visibility, review decides eligibility: a published
 * profile whose plan lapses is hidden, and comes back when the plan does,
 * without another review. A profile never reviewed is never published here.
 */
export async function syncVisibility(service: SupabaseClient, providerId: string, planLive: boolean) {
  const { data } = await service.from("providers").select("status, published_at").eq("id", providerId).single();
  if (!data) return;
  const next = !planLive && data.status === "published" ? "hidden" : planLive && data.status === "hidden" && data.published_at ? "published" : null;
  if (!next) return;
  await service.from("providers").update({ status: next, updated_at: new Date().toISOString() }).eq("id", providerId);
}

/** Name and photo changes on a live profile, for admin's "recent changes" list. */
export async function logChange(supabase: SupabaseClient, providerId: string, userId: string, field: string, oldValue: string | null, newValue: string | null) {
  const { data } = await supabase.from("providers").select("status").eq("id", providerId).single();
  if (data?.status !== "published") return;
  await supabase.from("provider_changes").insert({ provider_id: providerId, field, old_value: oldValue, new_value: newValue, changed_by: userId });
}
