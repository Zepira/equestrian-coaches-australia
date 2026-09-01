import type { Discipline } from "@/lib/disciplines";

const PILL_CLASSNAME =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-ink-fg/55 px-4 py-2 text-sm text-ink-fg backdrop-blur-[2px] transition-colors hover:bg-ink-fg/10 lg:text-base";

/** The "Popular" quick-filter row under the hero search bar. */
export function HeroPopularDisciplines({
  disciplines,
  totalDisciplineCount,
}: {
  disciplines: Discipline[];
  totalDisciplineCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-fg/70 lg:text-sm">Popular</span>
      {disciplines.map((discipline) => (
        <a key={discipline.slug} href={`/disciplines/${discipline.slug}`} className={PILL_CLASSNAME}>
          {discipline.name}
        </a>
      ))}
      <a
        href="/search"
        className="inline-flex min-h-11 items-center py-2 text-sm text-[#e7b8a6] shadow-[inset_0_-1px_0_rgba(231,184,166,0.5)] lg:text-base"
      >
        All {totalDisciplineCount} disciplines
      </a>
    </div>
  );
}
