"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { profilePath } from "@/lib/page-paths";

/**
 * The professional's one public reply under a review (M5). They can write,
 * change or clear it; they can't touch the review itself or take it down.
 */
export async function replyToReview(reviewId: string, fd: FormData) {
  const { providerId, provider } = await requireProvider();
  const service = createServiceSupabase();
  if (!service) return;
  const reply = String(fd.get("reply") ?? "").trim().replace(/\r\n/g, "\n");
  if (reply.length > 1500) redirect(`/dashboard/reviews?error=${encodeURIComponent("Keep the reply under 1,500 characters.")}#r-${reviewId}`);
  const { data: r } = await service.from("reviews").select("id").eq("id", reviewId).eq("provider_id", providerId).eq("status", "published").maybeSingle();
  if (!r) redirect("/dashboard/reviews");
  await service
    .from("reviews")
    .update({ provider_reply: reply || null, provider_replied_at: reply ? new Date().toISOString() : null })
    .eq("id", reviewId);
  revalidatePath(profilePath(provider.slug as string));
  revalidatePath("/dashboard/reviews");
  redirect(`/dashboard/reviews?done=${encodeURIComponent(reply ? "Your reply is on your profile." : "Reply removed.")}#r-${reviewId}`);
}
