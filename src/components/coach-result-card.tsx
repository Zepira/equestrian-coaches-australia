import Link from "next/link";
import type { CoachCardData } from "@/components/coach-card";

export type CoachResultData = CoachCardData & {
  takingStudents?: "yes" | "waitlist" | "no";
  travelRadiusKm?: number | null;
  lat?: number | null;
  long?: number | null;
};

/**
 * "Based in Bendigo" vs "Travels to Bendigo from Castlemaine" — the
 * product rule from CLAUDE.md, spelled out on every result card. A coach
 * within a few km of the searched town is based there; one further away
 * who has set a travel radius that reaches the town travels to it; anyone
 * else is simply based where they are (the rider travels).
 */
export function whereLine(coach: CoachResultData, searchTown: string | null) {
  const home = `${coach.suburb}`;
  const d = coach.distanceKm;
  if (!searchTown || d == null) return `Based in ${home}`;
  const sameTown = d <= 5 || coach.suburb.toLowerCase() === searchTown.toLowerCase();
  if (sameTown) return `Based in ${home}`;
  if (coach.travelRadiusKm != null && coach.travelRadiusKm >= d) return `Travels to ${searchTown} from ${home}`;
  return `Based in ${home}`;
}

/**
 * The search result card (canvas: Search Results, both frames). Arch
 * thumbnail, name with the italic terracotta distance, discipline line,
 * where-line, two-line headline, attribute tag pills. `active` draws the
 * terracotta border the map pin selection uses.
 */
export function CoachResultCard({
  coach,
  searchTown = null,
  active = false,
  onHover,
  className = "",
}: {
  coach: CoachResultData;
  searchTown?: string | null;
  active?: boolean;
  onHover?: () => void;
  className?: string;
}) {
  const km = typeof coach.distanceKm === "number" ? `${Math.round(coach.distanceKm)} km` : null;
  const tags = (coach.attributeNames ?? []).slice(0, 2);
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      data-active={active}
      className={`grid grid-cols-[104px_1fr] gap-3.5 rounded-[16px] border bg-surface p-2.5 text-inherit transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(.16,1,.3,1)] wide:grid-cols-[110px_1fr] wide:gap-4 wide:rounded-[18px] wide:p-3 wide:hover:-translate-y-[3px] ${active ? "border-accent" : "border-border"} ${className}`}
    >
      <div className="h-[130px] w-[104px] overflow-hidden rounded-t-[52px] rounded-b-[8px] bg-shade wide:h-[138px] wide:w-[110px] wide:rounded-t-[55px]">
        {coach.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.photoUrl} alt="" className="block h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <span className="flex min-w-0 flex-col py-1 pr-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[24px] leading-none text-ink wide:text-[26px]">{coach.name}</span>
          {km && <span className="whitespace-nowrap font-display text-[18px] italic text-accent wide:text-[19px]">{km}</span>}
        </span>
        <span className="mt-[5px] text-[13px] font-medium text-accent wide:mt-1.5">{coach.disciplineNames.join(" · ")}</span>
        <span className="mt-1 text-[13px] text-subtle">{whereLine(coach, searchTown)}</span>
        <span className="mt-2 line-clamp-2 text-[14px] leading-[1.4] text-muted">{coach.headline}</span>
        {tags.length > 0 && (
          <span className="mt-auto flex flex-wrap gap-1.5 pt-2 wide:pt-2.5">
            {tags.map((t) => (
              <span key={t} className="rounded-[var(--radius-pill)] bg-shade px-[9px] py-1 text-[11px] font-medium text-muted">
                {t}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
