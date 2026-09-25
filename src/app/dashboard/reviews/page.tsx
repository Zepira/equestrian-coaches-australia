import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import { Stars } from "@/components/profile-reviews";
import { loadDashboard } from "@/lib/dashboard";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getReviewSummary } from "@/lib/reviews";
import { shareKitLinks } from "@/lib/share-kit";
import { absoluteUrl } from "@/lib/site-url";
import { profilePath } from "@/lib/page-paths";
import { replyToReview } from "./actions";

export const metadata = { title: "Reviews", robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" });

/**
 * Dashboard → Reviews (M5): the link to ask clients for a review, every
 * published review with a reply box, and how the rules work, said plainly.
 */
export default async function DashboardReviewsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/reviews");
  const service = createServiceSupabase();
  if (!service) return null;
  const { provider, firstName, professions } = ctx;
  const slug = provider.slug as string;
  const audience = `${professions[0].audienceNoun}s`;
  const [summary, links] = await Promise.all([getReviewSummary(service, ctx.providerId), shareKitLinks(service, { id: ctx.providerId, slug })]);
  const reviewLink = absoluteUrl(`/go/${links.find((l) => l.kind === "review")?.slug}`);
  const card = "rounded-[16px] border border-border bg-surface p-4 wide:p-5";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[34px] leading-none text-ink wide:text-[40px]">Reviews</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.5] text-muted">
          {summary.count > 0 ? (
            <>
              {summary.average!.toFixed(1)} out of 5 from {summary.count} {summary.count === 1 ? "review" : "reviews"}, {firstName}.{" "}
              <Link href={`${profilePath(slug)}#reviews`} className="font-medium text-accent">See them on your profile</Link>
            </>
          ) : (
            <>No reviews yet, {firstName}. Send the link below to {audience} you&rsquo;ve worked with.</>
          )}
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}

      <section className={card} data-review-link>
        <h2 className="font-display text-[22px] leading-none text-ink">Ask for a review</h2>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-subtle">
          Send this to your {audience}, by text or email. It asks them how it was, nothing leading, and they confirm their email before it posts. We also ask people who enquire through the site, a few weeks later, whether they booked you.
        </p>
        <div className="mt-3"><CopyField value={reviewLink} label="Review link" /></div>
      </section>

      <section className={card}>
        <h2 className="font-display text-[22px] leading-none text-ink">The rules</h2>
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.5] text-muted">
          <li>Every genuine review goes up, including the bad ones. We can&rsquo;t take one down because you ask, and your plan makes no difference.</li>
          <li>Don&rsquo;t offer anything in return for a review, and don&rsquo;t write one yourself or ask family, staff or friends to.</li>
          <li>You can post one public reply under each review, and change it any time.</li>
          <li>If a review is fake or breaks the policy, use &ldquo;Report this review&rdquo; under it on your profile.</li>
        </ul>
        <p className="mt-2.5 text-[13.5px]"><Link href="/review-policy" className="font-medium text-accent">The full review policy</Link></p>
      </section>

      {summary.reviews.map((r) => (
        <article key={r.id} id={`r-${r.id}`} className={`${card} scroll-mt-24`} data-dashboard-review>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars rating={r.rating} />
            <span className="text-[14px] font-medium text-fg">{r.author}</span>
            <span className="text-[13px] text-subtle">{when(r.date)}</span>
            {r.enquiredThroughUs && <span className="text-[12.5px] text-subtle">· Enquired through the site</span>}
          </div>
          <p className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.55] text-fg">{r.body}</p>
          <form action={replyToReview.bind(null, r.id)} className="mt-3.5 flex flex-col gap-2">
            <label className="text-[13px] font-medium text-fg" htmlFor={`reply-${r.id}`}>{r.reply ? "Your reply" : "Reply publicly"}</label>
            <textarea id={`reply-${r.id}`} name="reply" rows={3} maxLength={1500} defaultValue={r.reply ?? ""} className="w-full rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] text-fg focus:border-accent focus:outline-none" />
            <div>
              <Button type="submit" variant="secondary">{r.reply ? "Save reply" : "Post reply"}</Button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
