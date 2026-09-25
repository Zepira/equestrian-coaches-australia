import Link from "next/link";
import type { ReviewSummary } from "@/lib/reviews";

const STAR = "M12 2.8l2.83 5.74 6.33.92-4.58 4.47 1.08 6.3L12 17.25l-5.66 2.98 1.08-6.3L2.84 9.46l6.33-.92z";

/** Five stars filled to the rating, read out as "4.5 out of 5". */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, rating - (n - 1)));
        return (
          <svg key={n} viewBox="0 0 24 24" width={size} height={size} aria-hidden className="text-accent">
            <path d={STAR} fill="currentColor" opacity={0.18} />
            {fill > 0 && (
              <path d={STAR} fill="currentColor" style={fill < 1 ? { clipPath: `inset(0 ${100 - fill * 100}% 0 0)` } : undefined} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "Australia/Melbourne" });

/**
 * Riders' reviews on a profile (The Marketing Engine M5). Newest first,
 * whatever the plan; every one has the report link and the professional's
 * reply if they wrote one. Testimonials are a separate block and never
 * count here.
 */
export function ProfileReviews({ summary, firstName, slug, audiencePlural }: { summary: ReviewSummary; firstName: string; slug: string; audiencePlural: string }) {
  return (
    <section className="mt-9 px-[18px] wide:mt-14 wide:px-0" id="reviews" data-reviews>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent">Reviews</p>
      {summary.count > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[34px] leading-none text-ink wide:text-[40px]">{summary.average!.toFixed(1)} out of 5</h2>
          <Stars rating={summary.average!} size={18} />
          <span className="text-[14px] text-subtle">
            from {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
        </div>
      ) : (
        <h2 className="mt-2.5 text-[30px] leading-none text-ink wide:text-[34px]">No reviews yet</h2>
      )}
      <p className="mt-2 text-[13.5px] leading-[1.5] text-subtle">
        Written by {audiencePlural} who used {firstName}. We publish the bad ones too.{" "}
        <Link href="/review-policy" className="font-medium text-accent">How reviews work</Link>
      </p>

      {summary.count > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {summary.reviews.map((r) => (
            <li key={r.id} className="rounded-[16px] border border-border bg-surface p-[18px] wide:p-[22px]" data-review>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars rating={r.rating} />
                <span className="text-[14px] font-medium text-fg">{r.author}</span>
                <span className="text-[13px] text-subtle">{when(r.date)}</span>
              </div>
              {r.enquiredThroughUs && (
                <p className="mt-1.5 text-[12.5px] text-subtle" data-review-tag>Enquired through Equine Professionals Australia</p>
              )}
              <p className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.55] text-fg">{r.body}</p>
              {r.reply && (
                <div className="mt-3.5 rounded-[12px] bg-shade p-3.5">
                  <p className="text-[12.5px] font-medium text-subtle">Reply from {firstName}</p>
                  <p className="mt-1 whitespace-pre-line text-[14.5px] leading-[1.5] text-fg">{r.reply}</p>
                </div>
              )}
              <Link href={`/reviews/${r.id}/report`} className="mt-3 inline-block text-[12.5px] text-subtle underline-offset-2 hover:underline" rel="nofollow">
                Report this review
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[14.5px]">
        <Link href={`/review/${slug}`} className="font-medium text-accent underline-offset-2 hover:underline" rel="nofollow">
          Used {firstName}? Write a review
        </Link>
      </p>
    </section>
  );
}
