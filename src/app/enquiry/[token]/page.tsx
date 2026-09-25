import { notFound } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ReviewForm } from "@/components/review-form";
import { createServiceSupabase } from "@/lib/supabase/service";
import { fillVariables, getContent } from "@/lib/cms/read";
import { enquiryByToken, reviewTarget } from "@/lib/reviews";
import { profilePath } from "@/lib/page-paths";
import { answerFollowup } from "@/app/review/actions";

export const metadata = { title: "Did you book?", robots: { index: false, follow: false } };

/**
 * /enquiry/[token] (M5): the link in "Did you end up booking?". Three
 * buttons; a yes opens the review form, marked "Enquired through Equine
 * Professionals Australia" once posted. Answering again changes the answer.
 */
export default async function EnquiryFollowupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceSupabase();
  if (!service) notFound();
  const e = await enquiryByToken(service, token);
  if (!e) notFound();
  const target = await reviewTarget(service, { id: e.provider_id as string });
  if (!target) notFound();
  const w = await getContent("reviews.words");
  const f = (s: string) => fillVariables(s, { name: target.name, audience_plural: target.audiencePlural });
  const { data: mine } = await service.from("reviews").select("status").eq("enquiry_id", e.id).neq("status", "removed").maybeSingle();
  const reviewed = Boolean(mine);

  const buttons = (
    <form action={answerFollowup} className="flex flex-col gap-2">
      <input type="hidden" name="t" value={token} />
      {(
        [
          ["booked", w.yes],
          ["not_booked", w.no],
          ["still_talking", w.talking],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          name="answer"
          value={value}
          aria-pressed={e.rider_outcome === value}
          className={`h-12 rounded-[var(--radius-pill)] border text-[15px] font-medium ${e.rider_outcome === value ? "border-ink bg-shade text-ink" : "border-border bg-surface text-fg hover:border-accent"}`}
        >
          {label}
        </button>
      ))}
    </form>
  );

  if (e.rider_outcome === "booked") {
    return (
      <AuthShell eyebrow="Review" title={f(w.heading)} lead={reviewed ? undefined : f(w.intro)} footer={<Link href="/review-policy" className="font-medium text-accent">Our review policy</Link>}>
        {reviewed ? (
          <p role="status" className="text-[15px] leading-[1.5] text-fg" data-review-done={mine?.status === "published" ? "live" : "held"}>
            {f(mine?.status === "published" ? w.confirmedLive : w.confirmedHeld)}
          </p>
        ) : (
          <ReviewForm
            providerId={target.id}
            enquiryToken={token}
            defaultName={String(e.rider_name ?? "")}
            declaration={f(w.declaration)}
            sent={f(w.sent)}
            confirmedLive={f(w.confirmedLive)}
            confirmedHeld={f(w.confirmedHeld)}
          />
        )}
      </AuthShell>
    );
  }
  return (
    <AuthShell
      eyebrow="Your enquiry"
      title={f(w.question)}
      lead={e.rider_outcome === "not_booked" ? f(w.thanksNo) : e.rider_outcome === "still_talking" ? f(w.thanksTalking) : undefined}
      footer={<Link href={profilePath(target.slug)} className="font-medium text-accent">{target.firstName}&rsquo;s profile</Link>}
    >
      {buttons}
    </AuthShell>
  );
}
