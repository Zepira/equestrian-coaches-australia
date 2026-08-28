import Link from "next/link";
import { getDisciplineBySlug } from "@/lib/disciplines";
import type { PlaceholderCoach } from "@/lib/placeholder-coaches";

export function CoachCard({ coach }: { coach: PlaceholderCoach }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="flex gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md sm:flex-col sm:gap-3"
    >
      <div className="h-20 w-20 flex-none rounded-md bg-accent-soft sm:h-40 sm:w-full" aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-lg font-semibold text-fg">{coach.name}</div>
        <div className="text-sm text-muted">
          {coach.suburb} {coach.state}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.disciplines.map((slug) => (
            <span
              key={slug}
              className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-fg"
            >
              {getDisciplineBySlug(slug)?.name}
            </span>
          ))}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted sm:line-clamp-3">{coach.headline}</p>
      </div>
    </Link>
  );
}
