"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CoachResultCard, type CoachResultData } from "@/components/coach-result-card";
import { useWide } from "@/lib/use-wide";

const CoachMap = dynamic(() => import("@/components/coach-map").then((m) => m.CoachMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-shade" aria-hidden />,
});

/**
 * A coach list with a List / Map toggle, for listing pages that aren't
 * /search (discipline pages, area pages). List is the plain card grid the
 * page always had. Map is the results-page arrangement: cards in one
 * column with the map pinned beside them on desktop, a full-height map
 * with a floating "List" button on phones. Hovering a card selects its
 * pin; tapping a pin selects its card and scrolls it into view. The map
 * frames every pin — there is no searched point here — so a discipline
 * with coaches in three states shows all three.
 */
export function CoachListMap({ coaches, searchTown = null }: { coaches: CoachResultData[]; searchTown?: string | null }) {
  const wide = useWide();
  const [view, setView] = useState<"list" | "map">("list");
  const [active, setActive] = useState<string | null>(coaches[0]?.slug ?? null);
  const activeCoach = coaches.find((c) => c.slug === active) ?? coaches[0] ?? null;
  const pins = coaches
    .filter((c) => c.lat != null && c.long != null)
    .map((c) => ({ slug: c.slug, lat: c.lat as number, long: c.long as number, km: c.distanceKm ?? null, name: c.name }));

  function select(slug: string) {
    setActive(slug);
    document.querySelector<HTMLElement>(`[data-coach-card="${slug}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const toggle = (
    <div role="group" aria-label="View" className="inline-flex rounded-[var(--radius-pill)] border border-border bg-surface p-1 text-[13px] font-medium">
      {(["list", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => setView(v)}
          className={`rounded-[var(--radius-pill)] px-3.5 py-1.5 capitalize transition-colors duration-200 ${
            view === v ? "bg-ink text-ink-fg" : "text-muted hover:text-ink"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  const map = (
    <CoachMap origin={null} radiusKm={50} pins={pins} activeSlug={activeCoach?.slug ?? null} onSelect={select} />
  );

  return (
    <div className="mt-5 wide:mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-subtle wide:text-[14px]">
          {coaches.length} coach{coaches.length === 1 ? "" : "es"}
          {pins.length < coaches.length ? ` · ${pins.length} on the map` : ""}
        </p>
        {toggle}
      </div>

      {view === "list" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {coaches.map((c) => (
            <div key={c.slug} data-coach-card={c.slug}>
              <CoachResultCard coach={c} searchTown={searchTown} />
            </div>
          ))}
        </div>
      ) : wide ? (
        <div className="mt-4 grid grid-cols-[1fr_minmax(420px,44%)] gap-5">
          <div className="flex max-h-[720px] flex-col gap-4 overflow-auto pr-1">
            {coaches.map((c) => (
              <div key={c.slug} data-coach-card={c.slug}>
                <CoachResultCard coach={c} searchTown={searchTown} active={c.slug === activeCoach?.slug} onHover={() => setActive(c.slug)} />
              </div>
            ))}
          </div>
          <div className="sticky top-[88px] h-[720px] overflow-hidden rounded-[18px] border border-border">{map}</div>
        </div>
      ) : (
        <div className="relative mt-4 h-[70dvh] min-h-[420px] overflow-hidden rounded-[16px] border border-border">
          {map}
          {activeCoach && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
              <div className="pointer-events-auto rounded-[14px] bg-surface p-2 shadow-[0_20px_50px_rgba(31,58,46,.18)]">
                <CoachResultCard coach={activeCoach} searchTown={searchTown} active />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
