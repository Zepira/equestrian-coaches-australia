import { CoachCard } from "@/components/coach-card";
import { LinkButton } from "@/components/ui/button";
import type { CoachCardData } from "@/components/coach-card";

/** Homepage "Featured coaches" section — a grid of coach cards plus a "see all" link. */
export function FeaturedCoaches({ coaches }: { coaches: CoachCardData[] }) {
  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Featured coaches
            </div>
            <h2 className="mt-4 text-4xl leading-[1.05] text-ink sm:text-5xl">
              Coaches taking riders now.
            </h2>
          </div>
          <LinkButton href="/search" variant="ghost" className="hidden shrink-0 sm:inline-flex">
            See all coaches →
          </LinkButton>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.map((coach) => (
            <CoachCard key={coach.slug} coach={coach} />
          ))}
        </div>
        <LinkButton href="/search" variant="secondary" className="mt-8 w-full sm:hidden">
          See all coaches
        </LinkButton>
      </div>
    </section>
  );
}
