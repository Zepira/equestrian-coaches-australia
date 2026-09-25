import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { reviewTarget } from "@/lib/reviews";
import { profilePath } from "@/lib/page-paths";
import { confirmReview } from "../actions";

export const metadata = { title: "Post your review", robots: { index: false, follow: false } };

/**
 * The link in "Confirm your review" lands here. One button, so the review
 * only posts when a person presses it (mail scanners open links).
 */
export default async function ConfirmReviewPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; p?: string }> }) {
  const { t, done, p } = await searchParams;
  if (done === "live" || done === "held") {
    const service = createServiceSupabase();
    const target = service && p ? await reviewTarget(service, { slug: p }) : null;
    const w = await getContent("reviews.words");
    const name = target?.name ?? "the professional";
    return (
      <AuthShell eyebrow="Review" title="Thank you" lead={fillVariables(done === "live" ? w.confirmedLive : w.confirmedHeld, { name })}>
        <p className="text-[14px] text-muted">
          {target ? (
            <Link href={profilePath(target.slug)} className="font-medium text-accent">Go to {target.firstName}&rsquo;s profile</Link>
          ) : (
            <Link href="/" className="font-medium text-accent">Back to the home page</Link>
          )}
        </p>
      </AuthShell>
    );
  }
  if (done === "unknown" || !t) {
    return (
      <AuthShell eyebrow="Review" title="That link has expired" lead="It may already have been used, or it's more than two weeks old.">
        <p className="text-[14px] text-muted">
          <Link href="/" className="font-medium text-accent">Back to the home page</Link>
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Review" title="Post your review?" lead="Press the button to confirm this is your email address and post the review.">
      <form action={confirmReview}>
        <input type="hidden" name="t" value={t} />
        <Button type="submit" className="h-12 w-full text-[15px]">Post my review</Button>
      </form>
    </AuthShell>
  );
}
