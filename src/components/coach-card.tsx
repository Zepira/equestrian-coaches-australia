import Link from "next/link";

export type CoachCardData = {
  slug: string;
  name: string;
  suburb: string;
  state: string;
  headline: string;
  disciplineNames: string[];
  photoUrl?: string | null;
  distanceKm?: number | null;
};

export function CoachCard({ coach }: { coach: CoachCardData }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="flex gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md sm:flex-col sm:gap-3"
    >
      <div
        className="h-20 w-20 flex-none rounded-md bg-accent-soft bg-cover bg-center sm:h-40 sm:w-full"
        style={coach.photoUrl ? { backgroundImage: `url(${coach.photoUrl})` } : undefined}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-lg font-semibold text-fg">{coach.name}</div>
          {typeof coach.distanceKm === "number" && (
            <span className="shrink-0 text-xs font-medium text-muted">
              {Math.round(coach.distanceKm)} km
            </span>
          )}
        </div>
        <div className="text-sm text-muted">
          {coach.suburb} {coach.state}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.disciplineNames.map((name) => (
            <span key={name} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-fg">
              {name}
            </span>
          ))}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted sm:line-clamp-3">{coach.headline}</p>
      </div>
    </Link>
  );
}
