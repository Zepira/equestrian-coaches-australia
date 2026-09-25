import { notFound } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ReviewForm } from "@/components/review-form";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { reviewTarget } from "@/lib/reviews";
import { profilePath } from "@/lib/page-paths";

export const metadata = { title: "Write a review", robots: { index: false, follow: false } };

/**
 * /review/[slug] (M5): the link a professional sends their clients. Asks
 * neutrally how it was; the reviewer confirms their email before it posts.
 */
export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = createServiceSupabase();
  const target = service ? await reviewTarget(service, { slug }) : null;
  if (!target) notFound();
  const w = await getContent("reviews.words");
  const f = (s: string) => fillVariables(s, { name: target.name, audience_plural: target.audiencePlural });
  return (
    <AuthShell
      eyebrow="Review"
      title={f(w.heading)}
      lead={f(w.intro)}
      footer={
        <>
          <Link href="/review-policy" className="font-medium text-accent">Our review policy</Link> ·{" "}
          <Link href={profilePath(target.slug)} className="font-medium text-accent">{target.firstName}&rsquo;s profile</Link>
        </>
      }
    >
      <ReviewForm providerId={target.id} declaration={f(w.declaration)} sent={f(w.sent)} confirmedLive={f(w.confirmedLive)} confirmedHeld={f(w.confirmedHeld)} />
    </AuthShell>
  );
}
