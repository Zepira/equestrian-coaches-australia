import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { createServiceSupabase } from "@/lib/supabase/service";
import { canSend } from "@/lib/audience";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { primaryProfessionOf } from "@/lib/coach-events";
import { profilePath } from "@/lib/page-paths";
import { absoluteUrl } from "@/lib/site-url";
import { getEnquiryFollowupDays, getReviewAlertEmails, holdAllReviews } from "@/lib/settings";

/**
 * Rider reviews (The Marketing Engine M5). Every read and write goes through
 * the service role from server code, so the reviewer's email and device hash
 * stay on the server; pages get PublicReview, which has neither.
 *
 * The rules (§05.7, the ACCC's guidance for review platforms): every genuine
 * review is published, bad ones too; it comes down only for a reason in
 * REMOVAL_REASONS, logged; plans never change which show, their order or the
 * average; nobody edits the words.
 */
type Service = NonNullable<ReturnType<typeof createServiceSupabase>>;

/** The only reasons a review comes down: the published policy's list (review_policy block). */
export const REMOVAL_REASONS = {
  fake: "Fake",
  conflict: "Conflict of interest",
  abusive: "Abusive",
  defamatory: "Defamatory",
  off_topic: "Off topic",
  personal_info: "Shares personal details",
} as const;
export type RemovalReason = keyof typeof REMOVAL_REASONS;
export const REPORT_REASONS = { ...REMOVAL_REASONS, other: "Something else" } as const;

export const FLAG_LABELS: Record<string, string> = {
  same_device: "Another review of this professional came from the same device",
  same_text: "The same words appear in another review",
};

export type PublicReview = {
  id: string;
  author: string;
  rating: number;
  body: string;
  /** Sent an enquiry through the site and told us they booked. */
  enquiredThroughUs: boolean;
  date: string;
  reply: string | null;
};
export type ReviewSummary = { count: number; average: number | null; reviews: PublicReview[] };

/** "Samantha Rowe" → "Samantha R." What a review shows, whatever they typed. */
export function displayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Anonymous";
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : first;
}

/** A one-way fingerprint of the device, kept only to spot several reviews from one place. */
export function deviceHash(ip: string, userAgent: string): string {
  return createHash("sha256").update(`review|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** The same words, however they're spaced or capitalised. */
export function textHash(body: string): string {
  return createHash("sha256").update(body.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).digest("hex").slice(0, 32);
}

/** Published reviews of one professional, newest first, and the average over all of them. */
export async function getReviewSummary(service: Service, providerId: string): Promise<ReviewSummary> {
  const { data } = await service
    .from("reviews")
    .select("id, author_name, rating, body, source, published_at, provider_reply")
    .eq("provider_id", providerId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const rows = data ?? [];
  const reviews = rows.map((r) => ({
    id: r.id as string,
    author: displayName(r.author_name as string),
    rating: r.rating as number,
    body: r.body as string,
    enquiredThroughUs: r.source === "enquiry",
    date: r.published_at as string,
    reply: (r.provider_reply as string | null) ?? null,
  }));
  const average = rows.length ? Math.round((rows.reduce((t, r) => t + (r.rating as number), 0) / rows.length) * 10) / 10 : null;
  return { count: rows.length, average, reviews };
}

/**
 * The checks that hold a review for a person: another review of the same
 * professional from this device, or the same words in any other review.
 */
export async function reviewFlags(service: Service, providerId: string, device: string, text: string): Promise<string[]> {
  const [{ count: sameDevice }, { count: sameText }] = await Promise.all([
    service.from("reviews").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("device_hash", device).neq("status", "removed"),
    service.from("reviews").select("id", { count: "exact", head: true }).eq("text_hash", text).neq("status", "removed"),
  ]);
  return [...((sameDevice ?? 0) > 0 ? ["same_device"] : []), ...((sameText ?? 0) > 0 ? ["same_text"] : [])];
}

/** The member addresses of a provider: who hears about their reviews. */
async function memberEmails(service: Service, providerId: string): Promise<string[]> {
  const { data } = await service.from("provider_members").select("profiles(email)").eq("provider_id", providerId);
  return (data ?? []).map((m) => (m as unknown as { profiles: { email: string | null } | null }).profiles?.email).filter((e): e is string => Boolean(e));
}

/** Whether this address belongs to one of the provider's own accounts. */
export async function isOwnAccount(service: Service, providerId: string, email: string): Promise<boolean> {
  return (await memberEmails(service, providerId)).some((e) => e.toLowerCase() === email.toLowerCase());
}

/**
 * A confirmed review goes up at once, unless every review is being held or
 * the checks flagged it; then it waits in Admin → Reviews.
 */
export async function afterConfirm(service: Service, reviewId: string): Promise<"published" | "pending"> {
  const { data: r } = await service.from("reviews").select("flags").eq("id", reviewId).single();
  const hold = (await holdAllReviews()) || ((r?.flags as string[] | null) ?? []).length > 0;
  if (hold) {
    await service.from("reviews").update({ status: "pending", confirmed_at: new Date().toISOString() }).eq("id", reviewId);
    await alertReviewers(service, reviewId);
    return "pending";
  }
  await service.from("reviews").update({ confirmed_at: new Date().toISOString() }).eq("id", reviewId);
  await publishReview(service, reviewId, null, null);
  return "published";
}

/** Put a review up (or back up), log it, tell the professional, refresh their profile. */
export async function publishReview(service: Service, reviewId: string, by: string | null, action: "publish" | "restore" | null) {
  const now = new Date().toISOString();
  const { data: r } = await service
    .from("reviews")
    .update({ status: "published", published_at: now, removal_reason: null })
    .eq("id", reviewId)
    .select("provider_id, author_name, rating, body, published_at, providers(name, slug)")
    .single();
  if (!r) return;
  await service.from("review_moderation_log").insert({ review_id: reviewId, action: action ?? "publish", note: action ? null : "Passed the checks; went up when confirmed", created_by: by });
  const p = (r as unknown as { providers: { name: string; slug: string } | null }).providers;
  if (p) revalidatePath(profilePath(p.slug));
  if (action === "restore") return;
  const copy = await getContent("email.review_published");
  const vars = {
    first_name: (p?.name ?? "").split(" ")[0] || "there",
    author: displayName(r.author_name as string),
    rating: String(r.rating),
    review: r.body as string,
    reviews_url: absoluteUrl("/dashboard/reviews"),
    policy_url: absoluteUrl("/review-policy"),
  };
  for (const to of await memberEmails(service, r.provider_id as string)) {
    await sendEmail({ to, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  }
}

/** Take a review down for one of the policy's reasons, and log it. */
export async function removeReview(service: Service, reviewId: string, reason: RemovalReason, note: string | null, by: string | null) {
  const { data: r } = await service.from("reviews").update({ status: "removed", removal_reason: reason }).eq("id", reviewId).select("providers(slug)").single();
  await service.from("review_moderation_log").insert({ review_id: reviewId, action: "remove", reason, note, created_by: by });
  const slug = (r as unknown as { providers: { slug: string } | null } | null)?.providers?.slug;
  if (slug) revalidatePath(profilePath(slug));
}

/** Tell whoever looks at new profiles that a review, or a report, is waiting. Staff email, plain words. */
export async function alertReviewers(service: Service, reviewId: string, report?: { reason: string; detail: string | null }) {
  const to = await getReviewAlertEmails();
  if (!to.length) return;
  const { data: r } = await service.from("reviews").select("rating, body, flags, providers(name)").eq("id", reviewId).single();
  const name = (r as unknown as { providers: { name: string } | null } | null)?.providers?.name ?? "a professional";
  const flags = ((r?.flags as string[] | null) ?? []).map((f) => FLAG_LABELS[f] ?? f);
  await sendEmail({
    to,
    subject: report ? `Review of ${name} reported` : `Review of ${name} waiting`,
    text: [
      report ? `Someone reported a review of ${name}: ${REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS] ?? report.reason}.${report.detail ? `\n\n"${report.detail}"` : ""}` : `A review of ${name} is waiting to be read.`,
      `${r?.rating ?? "?"} out of 5: "${r?.body ?? ""}"`,
      flags.length ? `Held because: ${flags.join("; ")}.` : "",
      absoluteUrl("/admin/reviews"),
    ].filter(Boolean).join("\n\n"),
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Did you end up booking?" (M5), once, a set number of days after an
 * enquiry that left an email address. Not for enquiries older than a month
 * past that, not for anyone who has answered already or reviewed the
 * professional, not for a professional who isn't live. Safe to run twice.
 */
export async function sendEnquiryFollowups(service: Service, now = new Date()) {
  const days = await getEnquiryFollowupDays();
  const due = new Date(now.getTime() - days * 86_400_000);
  const oldest = new Date(due.getTime() - 30 * 86_400_000);
  const { data: candidates } = await service
    .from("enquiries")
    .select("id, provider_id, rider_name, rider_contact, created_at, providers!inner(name, status)")
    .is("rider_answered_at", null)
    .lte("created_at", due.toISOString())
    .gte("created_at", oldest.toISOString())
    .eq("providers.status", "published");
  // A row in enquiry_followups means it's been dealt with, sent or not.
  const ids = (candidates ?? []).map((e) => e.id as string);
  const { data: done } = ids.length ? await service.from("enquiry_followups").select("enquiry_id").in("enquiry_id", ids) : { data: [] };
  const handled = new Set((done ?? []).map((d) => d.enquiry_id as string));
  const rows = (candidates ?? []).filter((e) => !handled.has(e.id as string));
  const copy = await getContent("email.enquiry_followup");
  let sent = 0;
  let skipped = 0;
  for (const e of rows) {
    const email = String(e.rider_contact ?? "").trim().toLowerCase();
    const provider = (e as unknown as { providers: { name: string } }).providers;
    const skip = () => service.from("enquiry_followups").insert({ enquiry_id: e.id, sent_at: null });
    if (!EMAIL.test(email)) {
      await skip();
      skipped++;
      continue;
    }
    const { count: reviewed } = await service.from("reviews").select("id", { count: "exact", head: true }).eq("provider_id", e.provider_id).eq("author_email", email); // stored lowercased
    if ((reviewed ?? 0) > 0 || !(await canSend(service, email, "factual")).ok) {
      await skip();
      skipped++;
      continue;
    }
    const { data: f, error } = await service.from("enquiry_followups").insert({ enquiry_id: e.id, sent_at: new Date().toISOString() }).select("token").single();
    if (error || !f) continue; // another run got there first
    const vars = {
      rider_first: String(e.rider_name ?? "").trim().split(/\s+/)[0] || "there",
      name: provider.name,
      enquiry_date: new Date(e.created_at as string).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Melbourne" }),
      answer_url: absoluteUrl(`/enquiry/${f.token}`),
    };
    await sendEmail({ to: email, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
    sent++;
  }
  return { sent, skipped };
}

/** The enquiry a follow-up link belongs to, or null. */
export async function enquiryByToken(service: Service, token: string) {
  if (!/^[a-f0-9]{32,80}$/.test(token)) return null;
  const { data: f } = await service.from("enquiry_followups").select("enquiry_id").eq("token", token).maybeSingle();
  if (!f) return null;
  const { data: e } = await service.from("enquiries").select("id, provider_id, rider_name, rider_contact, rider_outcome, status").eq("id", f.enquiry_id).maybeSingle();
  return e;
}

/** A live professional a review page is about, with the words their pages use for their clients. */
export async function reviewTarget(service: Service, by: { slug?: string; id?: string }) {
  let q = service.from("providers").select("id, name, slug, status");
  q = by.id ? q.eq("id", by.id) : q.eq("slug", by.slug ?? "");
  const { data: p } = await q.maybeSingle();
  if (!p || p.status !== "published") return null;
  const professionId = await primaryProfessionOf(p.id as string);
  const professions = await getProfessions();
  const profession = professions.find((x) => x.id === professionId) ?? professions.find((x) => x.slug === "coaches")!;
  return { id: p.id as string, name: p.name as string, slug: p.slug as string, firstName: String(p.name).split(" ")[0], audiencePlural: `${profession.audienceNoun}s` };
}
