import Link from "next/link";
import { profilePath } from "@/lib/page-paths";

export type CoachCardData = {
  slug: string;
  name: string;
  suburb: string;
  state: string;
  headline: string;
  disciplineNames: string[];
  skillNames?: string[];
  attributeNames?: string[];
  photoUrl?: string | null;
  distanceKm?: number | null;
  /** Where the card goes; a coach profile by default. Horse care professionals pass /profile/<slug>. */
  href?: string;
  /** Published reviews (M5): the average and how many. Absent or null with none. */
  rating?: { average: number; count: number } | null;
};

/** "★ 4.7 · 12 reviews" on a card: only with at least one published review. */
export function RatingLine({ rating, className = "" }: { rating?: { average: number; count: number } | null; className?: string }) {
  if (!rating || rating.count < 1) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] text-subtle ${className}`} aria-label={`${rating.average.toFixed(1)} out of 5 from ${rating.count} ${rating.count === 1 ? "review" : "reviews"}`} data-rating>
      <span aria-hidden className="text-accent">★</span>
      <span aria-hidden>
        <span className="font-medium text-fg">{rating.average.toFixed(1)}</span> · {rating.count} {rating.count === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}

/**
 * The featured-coach card from canvas 1a: a 4:5 arch-topped photo with a
 * blurred ink "N km · Town" badge in its corner, the name in Instrument
 * Serif, the disciplines in terracotta, then the headline. 250px wide in
 * the phone rail; a grid cell on desktop, lifting 6px on hover.
 */
export function CoachCard({ coach, className = "" }: { coach: CoachCardData; className?: string }) {
  const badge =
    typeof coach.distanceKm === "number"
      ? `${Math.round(coach.distanceKm)} km · ${coach.suburb} ${coach.state}`
      : `${coach.suburb} ${coach.state}`;
  return (
    <Link
      href={coach.href ?? profilePath(coach.slug)}
      className={`flex flex-col gap-3 text-inherit transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] wide:gap-3.5 wide:hover:-translate-y-1.5 ${className}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-[125px] rounded-b-[10px] bg-shade wide:rounded-t-[999px] wide:rounded-b-[12px]">
        {coach.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.photoUrl} alt="" data-parallax="drift" data-parallax-speed="0.08" data-parallax-max="40" className="parallax-drift block h-full w-full object-cover" loading="lazy" />
        ) : null}
        <span className="absolute bottom-3 left-3 rounded-[var(--radius-pill)] bg-ink-deep/82 px-2.5 py-[5px] text-[12px] font-medium text-ink-fg backdrop-blur-[6px] wide:bottom-3.5 wide:left-3.5 wide:px-[11px] wide:py-1.5">
          {badge}
        </span>
      </div>
      <div className="min-w-0">
        <div className="font-display text-[24px] leading-[1.05] text-ink wide:text-[28px] wide:leading-[1.02]">
          {coach.name}
        </div>
        <div className="mt-[5px] text-[13px] font-medium text-accent">{coach.disciplineNames.join(" · ")}</div>
        <RatingLine rating={coach.rating} className="mt-1" />
        <p className="mt-2 text-[14px] leading-[1.45] text-muted wide:text-[15px]">{coach.headline}</p>
      </div>
    </Link>
  );
}
