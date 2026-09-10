"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CoachResultCard, type CoachResultData, whereLine } from "@/components/coach-result-card";
import { SearchChips, useChipState } from "@/components/search-chips";
import { SearchBar } from "@/components/search-bar";
import { useWide } from "@/lib/use-wide";

const CoachMap = dynamic(() => import("@/components/coach-map").then((m) => m.CoachMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-shade" aria-hidden />,
});

const RADII = [25, 50, 75, 100, 125, 150];

/**
 * The results page body (canvas: Search Results). Phones: list first with
 * the floating Map / List toggle; desktop: chips + radius on the left, a
 * 2-col card grid, and the map pinned beside it. Hovering a card selects
 * its pin; clicking a pin selects its card; the selected coach's card also
 * sits over the bottom of the map.
 */
export function SearchResults({
  results,
  origin,
  searchTown,
  locationText,
  radiusKm,
  editing,
  disciplineSlug,
  locationNotFound,
}: {
  results: CoachResultData[];
  origin: { lat: number; long: number } | null;
  searchTown: string | null;
  locationText: string;
  radiusKm: number;
  editing: boolean;
  disciplineSlug: string;
  locationNotFound: boolean;
}) {
  const wide = useWide();
  const [view, setView] = useState<"list" | "map">("list");
  const [active, setActive] = useState<string | null>(results[0]?.slug ?? null);
  const [radius, setRadiusLocal] = useState(radiusKm);
  const [radiusFromUrl, setRadiusFromUrl] = useState(radiusKm);
  const sliderRef = useRef<HTMLInputElement>(null);
  const { params, push } = useChipState();

  // The slider tracks locally while dragging and commits to the URL on the
  // native `change` (release / key up), so results reload once per pick,
  // not per pixel. When the URL's radius changes (back/forward, a chip
  // push), re-sync the local value — the "adjust state during render"
  // pattern, not a setState inside an effect.
  if (radiusKm !== radiusFromUrl) {
    setRadiusFromUrl(radiusKm);
    setRadiusLocal(radiusKm);
  }
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const commit = () => {
      const r = Number(el.value);
      if (r === radiusKm) return;
      const next = new URLSearchParams(params.toString());
      next.set("r", String(r));
      push(next);
    };
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  }, [params, push, radiusKm]);

  const activeCoach = results.find((c) => c.slug === active) ?? results[0] ?? null;
  const pins = results
    .filter((c) => c.lat != null && c.long != null)
    .map((c) => ({ slug: c.slug, lat: c.lat as number, long: c.long as number, km: c.distanceKm ?? null }));
  const near = searchTown ? ` near ${searchTown}` : "";
  const countText = `${results.length} coach${results.length === 1 ? "" : "es"}`;

  const radiusSlider = (
    <input
      ref={sliderRef}
      type="range"
      min={25}
      max={150}
      step={25}
      value={radius}
      onChange={(e) => setRadiusLocal(Number(e.target.value))}
      aria-label="Search radius in kilometres"
      className="w-full accent-accent"
      list="radius-steps"
    />
  );

  const notify = (
    <div className="mt-7 flex flex-col gap-3.5 rounded-[16px] bg-ink p-[22px] text-ink-fg wide:flex-row wide:items-center wide:justify-between wide:gap-6 wide:rounded-[18px] wide:px-7 wide:py-[26px]">
      <div>
        <div className="font-display text-[26px] leading-none wide:text-[28px]">Nobody quite right?</div>
        <p className="mt-2 text-[14px] leading-[1.5] text-ink-fg/78 wide:text-[15px]">
          Tell us your discipline and town and we&apos;ll email you when a coach lists nearby.
        </p>
      </div>
      <Link
        href={`/account?alerts=1${locationText ? `&location=${encodeURIComponent(locationText)}` : ""}${disciplineSlug ? `&d=${disciplineSlug}` : ""}#alerts`}
        className="inline-block self-start border-b border-current text-[14px] font-medium text-peach wide:shrink-0 wide:rounded-[var(--radius-pill)] wide:border-0 wide:bg-bg wide:px-[22px] wide:py-[13px] wide:text-[15px] wide:font-semibold wide:text-ink"
      >
        Notify me
      </Link>
    </div>
  );

  const mapPanel = (
    <div className="relative h-full overflow-hidden bg-shade">
      <CoachMap origin={origin} radiusKm={radiusKm} pins={pins} activeSlug={activeCoach?.slug ?? null} onSelect={setActive} />
      {activeCoach && (
        <Link
          href={`/coaches/${activeCoach.slug}`}
          className="fade-in absolute inset-x-3.5 bottom-[88px] grid grid-cols-[72px_1fr] gap-3 rounded-[14px] border border-border bg-surface p-2.5 text-inherit shadow-[0_20px_50px_rgba(31,58,46,.18)] wide:inset-x-4 wide:bottom-4"
          style={{ animationDuration: "0.4s" }}
        >
          <span className="h-[88px] w-[72px] overflow-hidden rounded-t-[36px] rounded-b-[6px] bg-shade">
            {activeCoach.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeCoach.photoUrl} alt="" className="block h-full w-full object-cover" />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="flex justify-between gap-2">
              <span className="font-display text-[22px] leading-none text-ink">{activeCoach.name}</span>
              {typeof activeCoach.distanceKm === "number" && (
                <span className="font-display text-[16px] italic text-accent">{Math.round(activeCoach.distanceKm)} km</span>
              )}
            </span>
            <span className="mt-1 block text-[13px] font-medium text-accent">{activeCoach.disciplineNames.join(" · ")}</span>
            <span className="mt-1 block text-[13px] text-subtle">{whereLine(activeCoach, searchTown)}</span>
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <>
      <datalist id="radius-steps">
        {RADII.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {editing && (
        <div className="border-b border-border bg-shade px-[18px] py-4 wide:px-12">
          <div className="mx-auto max-w-[1184px]">
            <SearchBar tone="plain" defaultDiscipline={disciplineSlug} defaultLocation={locationText} autoFocus />
          </div>
        </div>
      )}

      {/* ── phones ──────────────────────────────────────────────────── */}
      <div className="wide:hidden">
        {view === "list" ? (
          <div className="px-[18px] pb-[100px] pt-[18px]">
            {locationNotFound && (
              <p className="mb-4 rounded-[12px] border border-border bg-accent-soft p-3 text-[14px] text-fg">
                Couldn&apos;t find &ldquo;{locationText}&rdquo; — showing coaches anywhere instead.
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <h1 className="font-display text-[30px] leading-none text-ink">{countText}</h1>
              <span className="text-[13px] text-subtle">Nearest first</span>
            </div>
            {origin && (
              <>
                <p className="mt-1.5 text-[14px] text-subtle">
                  Within {radius} km of {locationText}
                </p>
                <div className="mt-3.5 flex items-center gap-3 text-[13px] text-subtle">
                  <span>25 km</span>
                  <span className="flex-1">{radiusSlider}</span>
                  <span>150 km</span>
                </div>
              </>
            )}
            <div className="mt-5 flex flex-col gap-3.5">
              {results.map((c) => (
                <CoachResultCard key={c.slug} coach={c} searchTown={searchTown} className="fade-in" />
              ))}
              {results.length === 0 && (
                <div className="rounded-[16px] border border-dashed border-border p-8 text-center text-muted">
                  No coaches match that search yet. Try a wider radius or another discipline.
                </div>
              )}
            </div>
            {notify}
          </div>
        ) : (
          <div className="h-[calc(100dvh-60px-160px)] min-h-[520px]">{!wide && mapPanel}</div>
        )}
        <div className="pointer-events-none sticky bottom-[18px] z-20 -mt-[72px] flex h-[54px] justify-center">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "map" : "list")}
            className="pointer-events-auto flex h-[52px] items-center gap-2.5 rounded-[var(--radius-pill)] bg-ink px-[22px] text-[15px] font-semibold text-ink-fg shadow-[0_16px_40px_rgba(20,40,31,.35)]"
          >
            <span aria-hidden className="h-2 w-2 rounded-full bg-peach" />
            {view === "list" ? "Map" : "List"}
          </button>
        </div>
      </div>

      {/* ── desktop ─────────────────────────────────────────────────── */}
      <div className="hidden min-h-[728px] grid-cols-[1fr_480px] wide:grid">
        <div className="pb-12 pl-12 pr-8 pt-7">
          <div className="flex flex-wrap items-center gap-2">
            <SearchChips />
            {origin && (
              <span className="ml-auto flex items-center gap-2.5 text-[13px] text-subtle">
                Radius
                <span className="w-[140px]">{radiusSlider}</span>
                <strong className="font-medium text-fg">{radius} km</strong>
              </span>
            )}
          </div>
          {locationNotFound && (
            <p className="mt-5 rounded-[12px] border border-border bg-accent-soft p-3 text-[14px] text-fg">
              Couldn&apos;t find &ldquo;{locationText}&rdquo; — showing coaches anywhere instead.
            </p>
          )}
          <div className="mt-7 flex items-baseline justify-between">
            <h1 className="font-display text-[44px] leading-none -tracking-[0.02em] text-ink">
              {countText}
              {near && <em className="text-accent">{near}</em>}
            </h1>
            <span className="text-[14px] text-subtle">Nearest first</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {results.map((c) => (
              <CoachResultCard
                key={c.slug}
                coach={c}
                searchTown={searchTown}
                active={c.slug === activeCoach?.slug}
                onHover={() => setActive(c.slug)}
              />
            ))}
            {results.length === 0 && (
              <div className="col-span-2 rounded-[18px] border border-dashed border-border p-8 text-center text-muted">
                No coaches match that search yet. Try a wider radius or another discipline.
              </div>
            )}
          </div>
          {notify}
        </div>
        {/* Mount the map only at desktop widths — CSS hides this column on
            phones, which would otherwise still run a second map. */}
        <div className="sticky top-[72px] h-[calc(100vh-72px)] min-h-[728px] border-l border-border">{wide && mapPanel}</div>
      </div>
    </>
  );
}
