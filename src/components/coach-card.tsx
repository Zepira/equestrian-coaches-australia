import Link from "next/link";

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
};

export function CoachCard({ coach }: { coach: CoachCardData }) {
  return (
    <Link href={`/coaches/${coach.slug}`} className="group flex flex-col gap-3">
      <div
        className="h-40 w-full flex-none bg-shade bg-cover bg-center transition-opacity group-hover:opacity-90 sm:h-56"
        style={coach.photoUrl ? { backgroundImage: `url(${coach.photoUrl})` } : undefined}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="truncate font-display text-xl font-medium text-ink">{coach.name}</div>
        <div className="mt-1 text-sm text-subtle">
          {coach.suburb} {coach.state}
          {typeof coach.distanceKm === "number" && ` · ${Math.round(coach.distanceKm)} km`}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.disciplineNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-shade px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{coach.headline}</p>
        {(coach.skillNames?.length || coach.attributeNames?.length) && (
          <p className="mt-1.5 line-clamp-1 text-xs text-subtle">
            {[...(coach.skillNames ?? []), ...(coach.attributeNames ?? [])].slice(0, 3).join(" · ")}
          </p>
        )}
        <div className="mt-2 text-sm font-semibold text-accent">View profile →</div>
      </div>
    </Link>
  );
}
