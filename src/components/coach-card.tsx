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
      {/* .lift lives on the photo alone, not the whole card — the card's
          text sits in normal flow below it, so lifting the whole <Link>
          on hover would drag the name/tags/headline up with the photo,
          reading as the text itself bouncing rather than the photo
          responding to you. */}
      <div className="lift arch-crop aspect-square w-full bg-shade" aria-hidden>
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
          style={coach.photoUrl ? { backgroundImage: `url(${coach.photoUrl})` } : undefined}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate font-display text-xl font-medium text-ink">{coach.name}</div>
          {typeof coach.distanceKm === "number" && (
            <span className="shrink-0 text-sm text-subtle">{Math.round(coach.distanceKm)} km</span>
          )}
        </div>
        <div className="mt-1 text-sm text-subtle">
          {coach.suburb} {coach.state}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.disciplineNames.map((name) => (
            <span
              key={name}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink"
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
