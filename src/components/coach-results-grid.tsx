import type { ReactNode } from "react";
import { CoachCard, type CoachCardData } from "@/components/coach-card";

/**
 * The coach results grid + empty state, shared by /search and every
 * discipline/area listing page. `emptyState` is optional — the two
 * gated area routes (discipline+area, riding-instructors+area) only ever
 * render once indexable_pages guarantees 3+ real coaches, so they never
 * actually hit the empty case and don't need to pass one.
 */
export function CoachResultsGrid({
  coaches,
  emptyState,
}: {
  coaches: CoachCardData[];
  emptyState?: ReactNode;
}) {
  if (coaches.length === 0 && emptyState) {
    return (
      <div className="mt-8 rounded-[var(--radius-tile)] border border-dashed border-border p-8 text-center text-muted">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {coaches.map((coach) => (
        <CoachCard key={coach.slug} coach={coach} />
      ))}
    </div>
  );
}
