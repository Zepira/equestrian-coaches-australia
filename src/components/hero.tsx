import { HeroBackground } from "@/components/hero-background";
import { HeroPopularDisciplines } from "@/components/hero-popular-disciplines";
import { SearchBar } from "@/components/search-bar";
import { disciplines, getPopularDisciplines } from "@/lib/disciplines";

type Term = { slug: string; name: string };

export function Hero({
  skills = [],
  attributes = [],
}: {
  skills?: Term[];
  attributes?: Term[];
}) {
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-ink">
      <HeroBackground />

      {/* Reserve space for the fixed, transparent-to-solid header above —
          heights match SiteHeader's own h-16/sm:h-20/lg:h-24. */}
      <div className="h-16 shrink-0 sm:h-20 lg:h-24" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col justify-end gap-6 px-4 pb-8 pt-6 text-ink-fg sm:px-6 sm:pb-10 lg:gap-7 lg:px-11 lg:pb-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-7">
          <div className="flex w-full max-w-xl flex-col gap-4 lg:max-w-2xl lg:gap-7">
            <div className="text-[13px] font-semibold uppercase tracking-[0.22em] text-ink-fg/85 sm:text-sm lg:text-base">
              Coaching, discipline by discipline
            </div>

            <h1 className="max-w-[16ch] font-display text-[44px] font-normal leading-[0.94] tracking-[-0.025em] text-ink-fg sm:text-6xl lg:text-8xl">
              Find your perfect riding coach, nearby.
            </h1>

            <div className="max-w-2xl">
              <SearchBar skills={skills} attributes={attributes} />
            </div>

            <HeroPopularDisciplines disciplines={getPopularDisciplines()} totalDisciplineCount={disciplines.length} />

            <div className="flex flex-wrap gap-6 border-t border-ink-fg/24 pt-5 text-[15px] text-ink-fg/85 lg:pt-7">
              <span>
                <strong className="font-display text-xl font-medium text-ink-fg lg:text-2xl">
                  {disciplines.length}
                </strong>{" "}
                disciplines listed
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
