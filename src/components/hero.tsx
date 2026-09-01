import { SearchBar } from "@/components/search-bar";
import { disciplines } from "@/lib/disciplines";

type Term = { slug: string; name: string };

const POPULAR_DISCIPLINE_SLUGS = [
  "dressage",
  "show-jumping",
  "western",
  "liberty",
  "working-equitation",
  "bridleless",
];

export function Hero({
  skills = [],
  attributes = [],
}: {
  skills?: Term[];
  attributes?: Term[];
}) {
  const popular = POPULAR_DISCIPLINE_SLUGS.map((slug) =>
    disciplines.find((d) => d.slug === slug),
  ).filter((d): d is NonNullable<typeof d> => Boolean(d));

  return (
    <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-ink">
      {/* Photo + gradient wash — sits behind the fixed header too */}
      <div className="absolute inset-0 z-0 h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- static local asset used as a full-bleed background, next/image adds nothing here */}
        <img
          src="/hero-coach.jpg"
          alt="A white horse cantering across a paddock at golden hour"
          className="h-full w-full object-cover object-[72%_62%] sm:object-[80%_55%] lg:object-[86%_52%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,24,18,0.34) 0%, rgba(13,24,18,0) 34%, rgba(31,58,46,0.55) 80%, rgba(31,58,46,1) 100%), linear-gradient(90deg, rgba(13,24,18,0.5) 0%, rgba(13,24,18,0.15) 45%, rgba(13,24,18,0) 70%)",
          }}
        />
      </div>

      {/* Reserve space for the fixed, transparent-to-solid header above */}
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

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-fg/70 lg:text-sm">
                Popular
              </span>
              {popular.map((d) => (
                <a
                  key={d.slug}
                  href={`/disciplines/${d.slug}`}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-ink-fg/55 px-4 py-2 text-sm text-ink-fg backdrop-blur-[2px] transition-colors hover:bg-ink-fg/10 lg:text-base"
                >
                  {d.name}
                </a>
              ))}
              <a
                href="/search"
                className="inline-flex min-h-11 items-center py-2 text-sm text-[#e7b8a6] shadow-[inset_0_-1px_0_rgba(231,184,166,0.5)] lg:text-base"
              >
                All {disciplines.length} disciplines
              </a>
            </div>

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
