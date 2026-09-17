"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { disciplines } from "@/lib/disciplines";
import { SelectMenu } from "@/components/ui/select-menu";
import { MultiSelectMenu } from "@/components/ui/multi-select-menu";
import type { TermOption } from "@/lib/term-options";
import { parseState } from "@/lib/au-states";
import { LocateButton } from "@/components/locate-button";
import { Caret } from "@/components/ui/caret";
import type { LocationSuggestion } from "@/app/api/location-suggest/route";

// The two setup terms riders reach for most — worth a one-tap pill on the
// card rather than two clicks into the panel. Slugs, matched against the
// real `terms` rows, so a term that's been renamed or deactivated simply
// drops out of the row instead of rendering a filter that finds nobody.
const QUICK_ATTRIBUTES = ["horses-available", "beginners-welcome"];

// The suggestion row's height has to reach the hero column in the same frame
// the row opens, or the column's compensating transform runs a frame behind
// the row's own growth and the fields visibly kick a few pixels before
// settling. That means measuring after layout but before paint —
// useLayoutEffect — which React warns about during SSR, hence the swap.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  defaultSkills = [],
  defaultAttributes = [],
  skills = [],
  attributes = [],
  disciplineOptions,
  tone = "glass",
  autoFocus = false,
}: {
  defaultDiscipline?: string;
  defaultLocation?: string;
  defaultSkills?: string[];
  defaultAttributes?: string[];
  /** The skill/attribute vocabulary, from the `terms` table. With both
   *  empty the refine row isn't rendered at all, so a caller that doesn't
   *  have them gets exactly the card it had before. */
  skills?: TermOption[];
  attributes?: TermOption[];
  /** The discipline list from the `terms` table; falls back to the static
   *  seed so the card still works with no server data. */
  disciplineOptions?: TermOption[];
  tone?: "glass" | "plain";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const disciplineList: TermOption[] = disciplineOptions ?? disciplines.map((d) => ({ slug: d.slug, name: d.name }));
  const [discipline, setDiscipline] = useState(defaultDiscipline);
  const [location, setLocation] = useState(defaultLocation);
  const [refine, setRefine] = useState<string[]>([...defaultSkills, ...defaultAttributes]);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestBodyRef = useRef<HTMLDivElement>(null);

  // Prefix suggestions. Two things keep this feeling instant even though
  // the API is a ~200ms round trip: every response is cached by query, and
  // on each keystroke the longest cached prefix of what's typed is narrowed
  // client-side and shown at once — the fetch (short debounce, stale
  // requests cancelled) then confirms or corrects it. Only towns that
  // aren't already exactly what's typed, max three — the canvas's "Did you
  // mean" row, not a full dropdown.
  const suggestCache = useRef(new Map<string, LocationSuggestion[]>());
  useEffect(() => {
    const q = location.trim();
    const lower = q.toLowerCase();
    const pick = (list: LocationSuggestion[]) =>
      list.filter((s) => s.value.toLowerCase() !== lower).slice(0, 3);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const cache = suggestCache.current;
    const exact = cache.get(lower);
    if (exact) {
      setSuggestions(pick(exact));
      return;
    }
    // Longest cached prefix, narrowed locally: "bend" → "bendi" needs no
    // round trip to drop Benda and Bendoc.
    for (let n = lower.length - 1; n >= 2; n--) {
      const prev = cache.get(lower.slice(0, n));
      if (!prev) continue;
      const isNumeric = /^\d+$/.test(lower);
      setSuggestions(
        pick(prev.filter((s) => (isNumeric ? s.postcode.startsWith(lower) : s.suburb.toLowerCase().startsWith(lower))))
      );
      break;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { suggestions: LocationSuggestion[] }) => {
          const list = data.suggestions ?? [];
          cache.set(lower, list);
          setSuggestions(pick(list));
        })
        .catch(() => {});
    }, 80);
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
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, discipline]);

  // The card grows downward when the suggestion row opens — but the hero's
  // column is bottom-anchored on phones and centred from 1100px, so left
  // alone that growth walks the search fields upward under the rider's
  // cursor mid-type. Publishing the row's height lets .hero__col cancel
  // exactly the share its own anchoring would have stolen (all of it when
  // bottom-anchored, half when centred), which pins the fields and sends the
  // whole of the growth downward into the pills and the stat line. No-ops
  // anywhere there is no hero — /search's edit card, the listing pages.
  useIsomorphicLayoutEffect(() => {
    const col = suggestBodyRef.current?.closest<HTMLElement>(".hero__col");
    if (!col) return;
    const height = suggestions.length > 0 ? (suggestBodyRef.current?.offsetHeight ?? 0) : 0;
    col.style.setProperty("--suggest-h", `${height}px`);
    return () => {
      col.style.removeProperty("--suggest-h");
    };
  }, [suggestions]);

  // "Show 12 near Bendigo", or "Show 40 across Victoria" for a state.
  const stateTyped = parseState(location);
  const town = stateTyped ? stateTyped.name : location.trim().split(/\s+/)[0];
  const hasLoc = location.trim().length > 0;
  const cta = hasLoc && count != null ? `Show ${count} ${stateTyped ? "across" : "near"} ${town}` : "Find a coach";

  // Skills and attributes are separate URL params (`s` and `a`) because the
  // RPC ORs within a kind and ANDs across them — but they share one picker,
  // so the picked slugs get split back apart by which list they came from.
  const skillSlugs = new Set(skills.map((t) => t.slug));
  const pickedSkills = refine.filter((s) => skillSlugs.has(s));
  const pickedAttributes = refine.filter((s) => !skillSlugs.has(s));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (discipline) params.set("d", discipline);
    if (pickedSkills.length) params.set("s", pickedSkills.join(","));
    if (pickedAttributes.length) params.set("a", pickedAttributes.join(","));
    router.push(`/search?${params.toString()}`);
  }

  const glass = tone === "glass";
  const shell = glass
    ? "bg-ink-fg/12 border border-ink-fg/22 backdrop-blur-[14px] rounded-[14px] wide:rounded-[16px]"
    : "bg-shade border border-border rounded-[14px] wide:rounded-[16px]";
  // Suggestion chips sit on the card, so they read against its own plate.
  // Hover inverts the pill (cream fill, ink text) rather than nudging its
  // opacity — on the photograph a 10% change in a translucent fill reads as
  // nothing. Tailwind's preflight also resets buttons to `cursor: default`,
  // so the pointer has to be asked for.
  const chip = glass
    ? "cursor-pointer border-ink-fg/35 bg-ink-fg/12 text-ink-fg hover:border-ink-fg hover:bg-ink-fg hover:text-ink"
    : "cursor-pointer border-border bg-surface text-fg hover:border-accent hover:bg-accent-soft";
  // The refine pills stand on their own below the card with nothing behind
  // them, so on the hero they have to carry their own contrast — a darker
  // fill and a stronger edge than a chip inside the card needs.
  const quickPill = (on: boolean) =>
    `cursor-pointer hover:-translate-y-px ${
      on
        ? "border-accent bg-accent text-accent-fg hover:bg-accent-hover"
        : glass
          ? "border-ink-fg/35 bg-ink-deep/40 text-ink-fg backdrop-blur-[10px] hover:border-ink-fg hover:bg-ink-fg hover:text-ink"
          : "border-border bg-surface/80 text-fg hover:border-ink hover:bg-surface"
    }`;

  // The suggestion row lives inside the card, under the fields. It is always
  // in the DOM and opens with a grid-rows 0fr→1fr transition rather than
  // being mounted and unmounted, so the card grows and shrinks smoothly and
  // whatever sits below it is carried by the same animation instead of
  // jumping. `order-5`/`basis-full` keep it the last row at every width —
  // as a mid-order item on phones it used to land between the location field
  // and the discipline/CTA row and shove them down mid-type.
  const chips = (
    <div
      className="suggest-row order-5 basis-full"
      data-shown={suggestions.length > 0}
      aria-hidden={suggestions.length === 0}
      role="listbox"
      id={listId}
      aria-label="Did you mean"
    >
      <div className="min-h-0 overflow-hidden">
        <div ref={suggestBodyRef} className="flex flex-wrap items-center gap-1.5 px-1 pb-0.5 pt-2">
          <span className={`hidden px-1 text-[13px] wide:inline ${glass ? "text-ink-fg/75" : "text-subtle"}`}>
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
              className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${chip}`}
            >
              {s.value}
            </button>
          ))}
        </div>
      </div>
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
        {count != null ? `${count} ${stateTyped ? "state-wide" : "nearby"}` : ""}
      </span>
      <LocateButton
        onLocated={(loc) => {
          setLocation(loc.value);
          setSuggestions([]);
          inputRef.current?.focus();
        }}
      />
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
        options={disciplineList.map((d) => ({ value: d.slug, label: d.name, keywords: d.aliases }))}
        // A floor, not a fixed width: the drawn caret is wider than the "▾"
        // it replaced, and without this "Any discipline" truncates to "Any
        // discipli…" at 1280 while the row still has room to give.
        className="js-only order-3 min-w-0 flex-1 wide:order-2 wide:min-w-[190px]"
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
          {disciplineList.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <Caret className="pointer-events-none absolute right-3.5 h-[1.1em] w-[1.1em] text-subtle wide:right-4" />
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
      className="order-4 flex min-h-12 w-[150px] shrink-0 items-center justify-center rounded-[9px] bg-accent px-[18px] text-center text-[16px] font-semibold leading-tight text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:order-3 wide:w-[206px] wide:rounded-[10px] wide:px-[18px]"
    >
      <span className="wide:hidden">Find a coach</span>
      <span className="hidden wide:inline">{cta}</span>
    </button>
  );

  // The refine row stands alone under the card — bare pills on the page, no
  // plate behind them — so the card stays the three fields a rider has to
  // fill in and these read as the optional extras they are. Outside the
  // <form> too, which costs nothing: the picks reach /search through
  // submit()'s own URLSearchParams, never through form serialisation.
  // Marked js-only, since with JavaScript off the menu can't open and a dead
  // control is worse than none (location and discipline still submit).
  const quick = QUICK_ATTRIBUTES.map((slug) => attributes.find((a) => a.slug === slug)).filter(
    (a): a is TermOption => Boolean(a)
  );
  const refineRow = (skills.length > 0 || attributes.length > 0) && (
    <div className="refine-row js-only relative mt-2.5 flex items-center gap-1.5">
      <MultiSelectMenu
        label="Skills & setup"
        groups={[
          { heading: "What they help you fix", options: skills },
          { heading: "What they offer", options: attributes },
        ].filter((g) => g.options.length > 0)}
        selected={refine}
        onApply={setRefine}
        triggerClassName={`flex items-center rounded-[var(--radius-pill)] border px-3.5 py-2 text-[13px] font-medium transition-[background-color,color,border-color,transform] duration-200 ${quickPill(refine.length > 0)}`}
      />
      {/* The quick pills scroll sideways rather than wrapping: a second
          wrapped line costs ~80px of column height, and on a 320px phone —
          where the hero column is bottom-anchored — that pushed the headline
          up underneath the header. The menu's own trigger stays outside this
          scroller, since an element that scrolls on one axis clips the
          other and would cut its panel off at the rail's edge. */}
      <div className="hs -mr-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pr-4 wide:mr-0 wide:flex-wrap wide:overflow-visible wide:pr-0">
        {quick.map((a) => {
          const on = refine.includes(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              aria-pressed={on}
              onClick={() => setRefine((r) => (on ? r.filter((v) => v !== a.slug) : [...r, a.slug]))}
              className={`shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border px-3.5 py-2 text-[13px] font-medium transition-[background-color,color,border-color,transform] duration-200 ${quickPill(on)}`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="search-card">
      <form
        action="/search"
        method="get"
        onSubmit={submit}
        className={`relative flex flex-wrap gap-1.5 p-2 ${shell}`}
        aria-label="Find a coach"
      >
        {locationField}
        {disciplineField}
        {button}
        {chips}
      </form>
      {refineRow}
    </div>
  );
}
