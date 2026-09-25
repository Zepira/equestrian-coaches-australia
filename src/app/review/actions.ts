"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent } from "@/lib/cms/read";
import { absoluteUrl } from "@/lib/site-url";
import { primaryProfessionOf } from "@/lib/coach-events";
import { afterConfirm, alertReviewers, deviceHash, enquiryByToken, isOwnAccount, REPORT_REASONS, reviewFlags, textHash } from "@/lib/reviews";

/**
 * Writing, confirming and reporting reviews, and answering "did you book?"
 * (The Marketing Engine M5). Nothing here trusts the page: the provider, the
 * enquiry and the email address are all looked up again on the server.
 */
export type ReviewResult = { ok: boolean; message: string; done?: "sent" | "live" | "held" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN = /^[a-f0-9]{32,80}$/;

async function device() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return deviceHash(ip, h.get("user-agent") ?? "");
}

export async function submitReview(_prev: ReviewResult, fd: FormData): Promise<ReviewResult> {
  // A field people can't see: anything that fills it in is a bot.
  if (String(fd.get("website") ?? "")) return { ok: true, message: "", done: "sent" };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "Reviews aren't connected yet." };

  const providerId = String(fd.get("provider_id") ?? "");
  const token = String(fd.get("enquiry_token") ?? "");
  const rating = Number(fd.get("rating"));
  const body = String(fd.get("body") ?? "").trim().replace(/\r\n/g, "\n");
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ");
  let email = String(fd.get("email") ?? "").trim().toLowerCase();

  const { data: provider } = await service.from("providers").select("id, name, status").eq("id", providerId).maybeSingle();
  if (!provider || provider.status !== "published") return { ok: false, message: "This profile isn't taking reviews right now." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Pick a rating from one to five stars." };
  if (body.length < 20) return { ok: false, message: "Write a sentence or two about what it was like." };
  if (body.length > 3000) return { ok: false, message: "That's a bit long. Keep it under 3,000 characters." };
  if (!name || name.length > 60) return { ok: false, message: "Add your name. We show your first name and the first letter of your surname." };
  if (fd.get("declaration") !== "on") return { ok: false, message: "Tick the box to say you've used their services and have no connection to them." };

  // From our follow-up email: the enquiry proves who they are.
  let enquiryId: string | null = null;
  if (token) {
    const e = await enquiryByToken(service, token);
    if (!e || e.provider_id !== providerId || e.rider_outcome !== "booked" || !EMAIL.test(String(e.rider_contact ?? "").trim())) {
      return { ok: false, message: "That link has expired." };
    }
    enquiryId = e.id as string;
    email = String(e.rider_contact).trim().toLowerCase();
  } else if (!EMAIL.test(email)) {
    return { ok: false, message: "That email address doesn't look right." };
  }

  if (await isOwnAccount(service, providerId, email)) return { ok: false, message: "You can't review your own profile." };
  const dev = await device();
  const { count: recent } = await service
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", dev)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((recent ?? 0) >= 5) return { ok: false, message: "That's a lot of reviews from one place today. Try again tomorrow." };

  const text = textHash(body);
  const flags = await reviewFlags(service, providerId, dev, text);
  const {
    data: { user },
  } = (await (await createClient())?.auth.getUser()) ?? { data: { user: null } };
  const { data: inserted, error } = await service
    .from("reviews")
    .insert({
      provider_id: providerId,
      profession_id: await primaryProfessionOf(providerId),
      rider_id: user?.id ?? null,
      enquiry_id: enquiryId,
      source: enquiryId ? "enquiry" : "request",
      author_name: name,
      author_email: email,
      rating,
      body,
      flags,
      device_hash: dev,
      text_hash: text,
    })
    .select("id, confirm_token")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return { ok: false, message: `You've already reviewed ${provider.name}. Each person can review a professional once.` };
    console.error("submitReview", error);
    return { ok: false, message: "Something went wrong saving that. Please try again shortly." };
  }

  if (enquiryId) {
    const result = await afterConfirm(service, inserted.id as string);
    return { ok: true, message: "", done: result === "published" ? "live" : "held" };
  }
  const copy = await getContent("email.review_confirm");
  const vars = { name: provider.name as string, confirm_url: absoluteUrl(`/review/confirm?t=${inserted.confirm_token}`) };
  await sendEmail({ to: email, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  return { ok: true, message: "", done: "sent" };
}

/** The button on /review/confirm. A page load changes nothing: mail scanners open links. */
export async function confirmReview(fd: FormData) {
  const token = String(fd.get("t") ?? "");
  const service = createServiceSupabase();
  if (!service || !TOKEN.test(token)) redirect("/review/confirm?done=unknown");
  const { data: r } = await service!.from("reviews").select("id, status, created_at, providers(slug)").eq("confirm_token", token).maybeSingle();
  if (!r || r.status !== "unconfirmed" || new Date(r.created_at as string).getTime() < Date.now() - 14 * 86_400_000) redirect("/review/confirm?done=unknown");
  const result = await afterConfirm(service!, r!.id as string);
  const slug = (r as unknown as { providers: { slug: string } | null }).providers?.slug ?? "";
  redirect(`/review/confirm?done=${result === "published" ? "live" : "held"}&p=${encodeURIComponent(slug)}`);
}

/** "Did you end up booking?" A yes also marks the enquiry booked for the professional's numbers. */
export async function answerFollowup(fd: FormData) {
  const token = String(fd.get("t") ?? "");
  const answer = String(fd.get("answer") ?? "");
  const service = createServiceSupabase();
  if (!service || !TOKEN.test(token) || !["booked", "not_booked", "still_talking"].includes(answer)) redirect("/");
  const e = await enquiryByToken(service!, token);
  if (!e) redirect(`/enquiry/${token}`);
  await service!
    .from("enquiries")
    .update({
      rider_outcome: answer,
      rider_answered_at: new Date().toISOString(),
      // Their yes is the outcome the monthly numbers email counts, unless the professional already marked it.
      ...(answer === "booked" && e!.status !== "booked" ? { status: "booked" } : {}),
    })
    .eq("id", e!.id);
  redirect(`/enquiry/${token}`);
}

export async function reportReview(_prev: ReviewResult, fd: FormData): Promise<ReviewResult> {
  if (String(fd.get("website") ?? "")) return { ok: true, message: "Thanks." };
  const service = createServiceSupabase();
  if (!service) return { ok: false, message: "Reports aren't connected yet." };
  const reviewId = String(fd.get("review_id") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const detail = String(fd.get("detail") ?? "").trim().slice(0, 1000) || null;
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!(reason in REPORT_REASONS)) return { ok: false, message: "Pick the rule you think it breaks." };
  if (reason === "other" && !detail) return { ok: false, message: "Tell us what's wrong with it." };
  if (email && !EMAIL.test(email)) return { ok: false, message: "That email address doesn't look right." };
  const { data: r } = await service.from("reviews").select("id").eq("id", reviewId).eq("status", "published").maybeSingle();
  if (!r) return { ok: false, message: "That review isn't showing any more." };
  const dev = await device();
  const { count } = await service.from("review_reports").select("id", { count: "exact", head: true }).eq("device_hash", dev).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 5) return { ok: false, message: "That's a lot of reports from one place today. Try again tomorrow." };
  await service.from("review_reports").insert({ review_id: reviewId, reason, detail, reporter_email: email || null, device_hash: dev });
  await alertReviewers(service, reviewId, { reason, detail });
  return { ok: true, message: "Thanks. We'll read the review against our policy and log what we decide." };
}
