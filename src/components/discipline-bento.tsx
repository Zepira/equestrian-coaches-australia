import Link from "next/link";
import { disciplinePhoto } from "@/lib/mock-coaches";

export type DisciplineTileData = {
  slug: string;
  name: string;
  blurb: string;
  count: number;
};

function countLabel(count: number) {
  return `${count} coach${count === 1 ? "" : "es"}`;
}

function DisciplineTile({
  discipline,
  area,
  big = false,
}: {
  discipline: DisciplineTileData;
  area: "db-big" | "db-med1" | "db-med2" | "db-s1" | "db-s2" | "db-s3";
  big?: boolean;
}) {
  return (
    <Link
      href={`/disciplines/${discipline.slug}`}
      className={`group photo-caption relative block h-48 sm:h-auto ${area} ${big ? "min-h-[280px] sm:min-h-0" : ""}`}
    >
      {big && <div className="discipline-bento-accent" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
      <img
        src={disciplinePhoto(discipline.slug)}
        alt={discipline.name}
        className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
      />
      <div className={`absolute inset-x-0 bottom-0 z-10 ${big ? "p-6 sm:p-8" : "p-5"}`}>
        <h3 className={big ? "text-3xl text-ink-fg sm:text-4xl" : "text-xl text-ink-fg"}>{discipline.name}</h3>
        {big && (
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-fg/85">{discipline.blurb}</p>
        )}
        {discipline.count > 0 && (
          <p className={big ? "mt-2 text-sm text-ink-fg/75" : "mt-1 text-sm text-ink-fg/80"}>
            {countLabel(discipline.count)}
          </p>
        )}
      </div>
    </Link>
  );
}

function DisciplineCtaTile({
  area,
  moreNames,
  total,
}: {
  area: "db-s1" | "db-s2" | "db-s3";
  moreNames: string[];
  total: number;
}) {
  return (
    <div className={`flex h-48 flex-col justify-center bg-ink p-6 sm:h-auto ${area}`}>
      {moreNames.length > 0 && (
        <p className="font-display text-xl leading-tight text-ink-fg">{moreNames.join(", ")}…</p>
      )}
      <Link
        href="/disciplines"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brass hover:text-ink-fg"
      >
        Browse all {total} disciplines →
      </Link>
    </div>
  );
}

// The featured-disciplines bento: one large tile, two medium tiles beside
// it, and a row of three small tiles beneath. Exactly 5 disciplines plus
// a "browse all" tile in the 6th slot — used on the homepage teaser.
export function DisciplineBentoTeaser({
  disciplines,
  moreNames,
  total,
}: {
  disciplines: DisciplineTileData[];
  moreNames: string[];
  total: number;
}) {
  const [big, med1, med2, s1, s2] = disciplines;
  if (!big || !med1 || !med2 || !s1 || !s2) return null;

  return (
    <div className="discipline-bento">
      <DisciplineTile discipline={big} area="db-big" big />
      <DisciplineTile discipline={med1} area="db-med1" />
      <DisciplineTile discipline={med2} area="db-med2" />
      <DisciplineTile discipline={s1} area="db-s1" />
      <DisciplineTile discipline={s2} area="db-s2" />
      <DisciplineCtaTile area="db-s3" moreNames={moreNames} total={total} />
    </div>
  );
}

// The full /disciplines listing: every discipline through the same bento
// pattern, repeated in groups of 6 (big + 2 medium + 3 small). A trailing
// group smaller than 6 falls back to a plain grid of small tiles rather
// than forcing an incomplete bento with empty slots.
export function DisciplineBentoAll({ disciplines }: { disciplines: DisciplineTileData[] }) {
  const groups: DisciplineTileData[][] = [];
  for (let i = 0; i < disciplines.length; i += 6) groups.push(disciplines.slice(i, i + 6));

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, i) =>
        group.length === 6 ? (
          <div key={i} className="discipline-bento">
            <DisciplineTile discipline={group[0]} area="db-big" big />
            <DisciplineTile discipline={group[1]} area="db-med1" />
            <DisciplineTile discipline={group[2]} area="db-med2" />
            <DisciplineTile discipline={group[3]} area="db-s1" />
            <DisciplineTile discipline={group[4]} area="db-s2" />
            <DisciplineTile discipline={group[5]} area="db-s3" />
          </div>
        ) : (
          <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {group.map((d) => (
              <Link key={d.slug} href={`/disciplines/${d.slug}`} className="group photo-caption relative block h-48">
                {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
                <img
                  src={disciplinePhoto(d.slug)}
                  alt={d.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <h3 className="text-xl text-ink-fg">{d.name}</h3>
                  {d.count > 0 && <p className="mt-1 text-sm text-ink-fg/80">{countLabel(d.count)}</p>}
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
