"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { disciplines } from "@/lib/disciplines";
import { SelectMenu } from "@/components/ui/select-menu";
import type { LocationSuggestion } from "@/app/api/location-suggest/route";

/**
 * The 1a search card. Location first ("Suburb or postcode", a terracotta
 * dot in front), then a discipline select and the CTA. As a rider types,
 * up to three "Did you mean" town chips appear (from /api/location-suggest,
 * prefix-matched against the real postcode table); once the field holds a
 * town, the CTA reads "Show N near Town" with N from /api/coach-count.
 *
 * Phones stack it (location row, chips, then select + CTA in one row);
 * from `wide` (1100px) it is a single row with the chips underneath.
 * Everything is uncommitted until submit: the card navigates to /search
 * exactly once, with location + discipline in the URL.
 *
 * `tone="glass"` is the hero's translucent card; `tone="plain"` renders the
 * same fields on a cream plate for pages without a photograph behind them.
 */
export function SearchBar({
  defaultDiscipline = "",
  defaultLocation = "",
  tone = "glass",
  autoFocus = false,
}: {
  defaultDiscipline?: string;
  defaultLocation?: string;
  tone?: "glass" | "plain";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [discipline, setDiscipline] = useState(defaultDiscipline);
  const [location, setLocation] = useState(defaultLocation);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefix suggestions, debounced, cancelling stale requests. Only towns
  // that aren't already exactly what's typed, max three — the canvas's
  // "Did you mean" row, not a full dropdown.
  useEffect(() => {
    const q = location.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { suggestions: LocationSuggestion[] }) => {
          const lower = q.toLowerCase();
          setSuggestions(
            (data.suggestions ?? []).filter((s) => s.value.toLowerCase() !== lower).slice(0, 3)
          );
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location]);

  // Live "N nearby" once the field looks like a town/postcode.
  useEffect(() => {
    const q = location.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 3) {
        setCount(null);
        return;
      }
      const params = new URLSearchParams({ location: q });
      if (discipline) params.set("d", discipline);
      fetch(`/api/coach-count?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { count: number | null }) => setCount(data.count ?? null))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, discipline]);

  const town = location.trim().split(/\s+/)[0];
  const hasLoc = location.trim().length > 0;
  const cta = hasLoc && count != null ? `Show ${count} near ${town}` : "Find a coach";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (discipline) params.set("d", discipline);
    router.push(`/search?${params.toString()}`);
  }

  const glass = tone === "glass";
  const shell = glass
    ? "bg-ink-fg/12 border border-ink-fg/22 backdrop-blur-[14px] rounded-[14px] wide:rounded-[16px]"
    : "bg-shade border border-border rounded-[14px] wide:rounded-[16px]";
  // The suggestion row now floats clear of the card, so it lands on top of
  // whatever sits below — the hero's stat row. It gets its own plate so it
  // reads as a popover over that content rather than as a collision with it,
  // and so the chips' contrast no longer depends on what the photograph
  // happens to show behind them.
  const plate = glass
    ? "border-ink-fg/20 bg-ink-deep/88 backdrop-blur-[14px] shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "border-border bg-surface shadow-[0_16px_38px_rgba(31,58,46,0.16)]";
  const chip = glass
    ? "border-ink-fg/35 bg-ink-fg/12 text-ink-fg hover:bg-ink-fg/22"
    : "border-border bg-shade text-fg hover:bg-accent-soft";

  // One set of fields in one row (location + discipline + CTA), with the
  // suggestion row hanging off the bottom of the card as an absolutely
  // positioned layer rather than as a flex item. As a flex item it was a
  // `basis-full` row appearing and disappearing mid-type: on phones it sat
  // between the location field and the discipline/CTA row and shoved them
  // down, and on desktop it grew the card and moved the hero's stat row.
  // Out of flow, nothing around it can move, which is also why the layer is
  // always rendered and toggled with `data-shown` — that gives it a real
  // fade/lift both ways instead of a hard cut.
  const chips = (
    <div
      className={`suggest-layer absolute left-0 top-full z-20 mt-2 flex max-w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-input)] border p-2 ${plate}`}
      data-shown={suggestions.length > 0}
      aria-hidden={suggestions.length === 0}
      role="listbox"
      id={listId}
      aria-label="Did you mean"
    >
      <span className={`hidden px-1 text-[13px] wide:inline ${glass ? "text-ink-fg/80" : "text-subtle"}`}>
        Did you mean
      </span>
      {suggestions.map((s) => (
        <button
          key={s.value}
          type="button"
          role="option"
          aria-selected={false}
          tabIndex={suggestions.length > 0 ? 0 : -1}
          onClick={() => {
            setLocation(s.value);
            setSuggestions([]);
            inputRef.current?.focus();
          }}
          className={`rounded-[var(--radius-pill)] border px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${chip}`}
        >
          {s.value}
        </button>
      ))}
    </div>
  );

  const locationField = (
    <label className="order-1 flex min-w-0 basis-full items-center gap-2.5 rounded-[9px] bg-surface px-3.5 text-fg wide:basis-0 wide:flex-[1.1] wide:rounded-[10px] wide:px-4">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      <span className="sr-only">Suburb or postcode</span>
      <input
        ref={inputRef}
        name="location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Suburb or postcode"
        autoComplete="off"
        autoFocus={autoFocus}
        aria-controls={listId}
        className="min-w-0 flex-1 bg-transparent py-3 text-[18px] text-fg outline-none placeholder:text-subtle wide:py-4"
      />
      <span
        aria-live="polite"
        className={`whitespace-nowrap text-[13px] font-medium text-subtle transition-opacity duration-200 wide:hidden ${
          hasLoc && count != null ? "opacity-100" : "opacity-0"
        }`}
      >
        {count != null ? `${count} nearby` : ""}
      </span>
    </label>
  );

  const disciplineField = (
    <>
      {/* The real control: a styled menu, so the option list carries the
          palette, the radii and the type instead of the OS's own grey list. */}
      <SelectMenu
        label="Discipline"
        value={discipline}
        onChange={setDiscipline}
        placeholder="Any discipline"
        options={disciplines.map((d) => ({ value: d.slug, label: d.name }))}
        className="js-only order-3 min-w-0 flex-1 wide:order-2"
        triggerClassName="flex h-full w-full items-center justify-between rounded-[9px] bg-surface px-3.5 py-[13px] text-left text-[16px] text-fg outline-none transition-colors duration-200 hover:bg-shade focus-visible:ring-2 focus-visible:ring-accent wide:rounded-[10px] wide:px-4 wide:py-4 wide:text-[18px]"
      />
      {/* JavaScript off: the plain form control takes over (globals.css hides
          it, layout.tsx's <noscript> block swaps the two back). */}
      <label className="nojs-only nojs-select relative order-3 min-w-0 flex-1 items-center rounded-[9px] bg-surface px-3.5 text-fg wide:order-2 wide:rounded-[10px] wide:px-4">
        <span className="sr-only">Discipline</span>
        <select
          name="d"
          defaultValue={discipline}
          className="w-full appearance-none bg-transparent py-[13px] pr-[18px] text-[16px] text-fg outline-none wide:py-4 wide:text-[18px]"
        >
          <option value="">Any discipline</option>
          {disciplines.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-3.5 text-[10px] text-subtle wide:right-4">
          ▾
        </span>
      </label>
    </>
  );

  // Fixed width, not content width. The label changes as soon as a count
  // lands ("Find a coach" → "Show 12 near Bendigo"), and a content-sized
  // button resized the discipline field next to it on every keystroke.
  // Phones keep the short label whatever happens — at 170px the long one
  // wraps to two lines and grows the whole card; the count is already shown
  // inside the location field there.
  const button = (
    <button
      type="submit"
      className="order-4 min-h-12 w-[150px] shrink-0 rounded-[9px] bg-accent px-[18px] text-left text-[16px] font-semibold leading-tight text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:order-3 wide:w-[230px] wide:rounded-[10px] wide:px-[22px]"
    >
      <span className="wide:hidden">Find a coach</span>
      <span className="hidden wide:inline">{cta}</span>
    </button>
  );

  return (
    <form
      action="/search"
      method="get"
      onSubmit={submit}
      className={`relative flex flex-wrap gap-1.5 p-2 ${shell}`}
      aria-label="Find a coach"
    >
      {locationField}
      {chips}
      {disciplineField}
      {button}
    </form>
  );
}
