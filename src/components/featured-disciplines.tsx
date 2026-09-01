import { DisciplineTag } from "@/components/discipline-tag";
import { LinkButton } from "@/components/ui/button";
import type { Discipline } from "@/lib/disciplines";
import { disciplinePhoto } from "@/lib/mock-coaches";

/** Homepage "Featured disciplines" section — 3 large tiles plus a row of smaller tags. */
export function FeaturedDisciplines({
  topDisciplines,
  moreDisciplines,
}: {
  topDisciplines: Discipline[];
  moreDisciplines: Discipline[];
}) {
  return (
    <section className="bg-shade">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Featured disciplines
            </div>
            <h2 className="mt-4 max-w-xl text-4xl leading-[1.05] text-ink sm:text-5xl">
              Start with the discipline you ride.
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-muted">
            Coaches are listed by the disciplines they actually teach, not by keyword.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {topDisciplines.map((d) => (
            <a key={d.slug} href={`/disciplines/${d.slug}`} className="group">
              <div className="arch-crop h-64 bg-border sm:h-80">
                {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
                <img
                  src={disciplinePhoto(d.slug)}
                  alt={d.name}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                />
              </div>
              <h3 className="mt-6 text-2xl font-medium text-ink">{d.name}</h3>
              <p className="mt-1 text-[17px] leading-relaxed text-muted">{d.blurb}</p>
            </a>
          ))}
        </div>

        <div className="mt-11 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2.5">
            {moreDisciplines.map((d) => (
              <DisciplineTag key={d.slug} slug={d.slug} />
            ))}
          </div>
          <LinkButton href="/search" variant="ghost" className="shrink-0">
            All disciplines →
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
