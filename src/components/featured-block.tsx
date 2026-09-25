import { CoachResultCard, type CoachResultData } from "@/components/coach-result-card";
import { HowWeListLink } from "@/components/how-we-list-link";

/**
 * The featured block: a labelled strip above the results (src/lib/featured.ts
 * decides who and when). It says plainly that it is paid for, and the people
 * in it still appear in the results at their own position.
 */
export function FeaturedBlock({ providers, searchTown = null, className = "" }: { providers: CoachResultData[]; searchTown?: string | null; className?: string }) {
  if (providers.length === 0) return null;
  return (
    <section aria-label="Featured" className={`rounded-[16px] border border-accent/30 bg-accent-soft/50 p-2.5 wide:p-3 ${className}`}>
      <p className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-1">
        <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent">Featured</span>
        <span className="text-[12px] text-subtle">
          Paid placement, taking turns each day. <HowWeListLink className="text-[12px]" />
        </span>
      </p>
      <div className="flex flex-col gap-2.5">
        {providers.map((p) => (
          <CoachResultCard key={p.slug} coach={p} searchTown={searchTown} />
        ))}
      </div>
    </section>
  );
}
