"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { publishReview, removeReview, REMOVAL_REASONS, type RemovalReason } from "@/lib/reviews";

/**
 * Admin → Reviews (M5). A review is published, taken down for one of the
 * policy's reasons, or put back. Every decision is logged with who and why.
 * The words of a review are never edited here.
 */
const back = (m: string, key = "done") => redirect(`/admin/reviews?${key}=${encodeURIComponent(m)}`);

export async function adminPublishReview(reviewId: string) {
  const { userId } = await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: r } = await service.from("reviews").select("status").eq("id", reviewId).single();
  if (r?.status !== "pending" && r?.status !== "removed") back("That review isn't waiting.", "error");
  await publishReview(service, reviewId, userId, r!.status === "removed" ? "restore" : "publish");
  revalidatePath("/admin/reviews");
  back(r!.status === "removed" ? "Put back on the profile." : "Published.");
}

export async function adminRemoveReview(reviewId: string, fd: FormData) {
  const { userId } = await requireAdmin();
  const reason = formText(fd, "reason", 30) as RemovalReason;
  const note = formText(fd, "note", 300) || null;
  if (!(reason in REMOVAL_REASONS)) back("Pick the policy reason it breaks. Nothing else is a reason to take a review down.", "error");
  const service = createServiceSupabase()!;
  await removeReview(service, reviewId, reason, note, userId);
  // Any open reports about it are answered by this decision.
  await service.from("review_reports").update({ resolved_at: new Date().toISOString(), resolved_by: userId }).eq("review_id", reviewId).is("resolved_at", null);
  revalidatePath("/admin/reviews");
  back(`Taken down: ${REMOVAL_REASONS[reason]}.`);
}

/** A report that doesn't hold up: the review stays, and the decision is logged. */
export async function dismissReport(reportId: string, fd: FormData) {
  const { userId } = await requireAdmin();
  const service = createServiceSupabase()!;
  const { data: rep } = await service.from("review_reports").update({ resolved_at: new Date().toISOString(), resolved_by: userId }).eq("id", reportId).select("review_id, reason").single();
  if (rep) await service.from("review_moderation_log").insert({ review_id: rep.review_id, action: "report_dismissed", reason: rep.reason, note: formText(fd, "note", 300) || null, created_by: userId });
  revalidatePath("/admin/reviews");
  back("Report closed. The review stays up.");
}
