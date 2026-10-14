"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "@/app/api/location-suggest/route";
import { placePanel } from "@/lib/anchored-panel";

/**
 * The suburb field, wherever a place is typed outside the hero search.
 *
 * Works like the address box on any checkout: type, pick from the list, and
 * the field fills with the full "Bendigo VIC 3550" and shows a tick. Two
 * modes:
 *
 * - `strict` (the default, for anything that gets saved): only a pick counts.
 *   Until there is one the input carries a custom validity message, so the
 *   browser won't submit the form and says why. Leaving the field with text
 *   that matches exactly one suggestion picks it, so typing "Bendigo" in
 *   full and tabbing on just works. The server checks again (verifyPlace in
 *   src/lib/places.ts); this only saves a round trip.
 * - `strict={false}` (search boxes): suggestions only, whole states offered,
 *   free text still submits, because search is meant to be forgiving.
 *
 * Controlled (`value` + `onChange`) or not (`defaultValue` + `name`). In a
 * strict field `name` goes on a hidden input that carries the place only
 * once it is picked, so a form that saves as you go never sends half a word.
 * Suggestions come from /api/location-suggest, the same postcodes table the
 * server resolves against.
 */
/** Fired (bubbling) on the input after a suburb is picked from the list. */
export const PLACE_PICKED = "place-picked";

export function LocationAutocomplete({
  value: controlled,
  defaultValue = "",
  onChange,
  onSelect,
  name,
  required,
  strict = true,
  placeholder,
  className,
  inputClassName,
  disabled,
  id,
  ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fires with the full suggestion (suburb/state/postcode split out) on a pick. */
  onSelect?: (suggestion: LocationSuggestion) => void;
  name?: string;
  required?: boolean;
  strict?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  // A saved place shown on load counts as picked; so does the last pick.
  const [picked, setPicked] = useState(controlled ?? defaultValue);
  const verified = value.trim() !== "" && value === picked;

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [place, setPlace] = useState({ dropUp: false, maxHeight: 256 });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const hintId = useId();

  const visible = strict ? suggestions.filter((s) => s.postcode) : suggestions;
  const showList = open && visible.length > 0;

  function setValue(v: string) {
    if (controlled === undefined) setOwn(v);
    onChange?.(v);
  }

  // Debounced fetch, cancelling any in-flight request so a slower stale
  // answer never overwrites a newer one. Nothing to look up once picked.
  useEffect(() => {
    const q = value.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 2 || value === picked) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { suggestions: LocationSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setActiveIndex(-1);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, picked]);

  // The browser's own form check does the blocking: a message here stops
  // submit and is announced, with no form-level code in each caller.
  useEffect(() => {
    inputRef.current?.setCustomValidity(strict && value.trim() && !verified ? "Pick your suburb from the list." : "");
  }, [strict, value, verified]);

  // Tell the form a place was picked, once the new value is in the DOM: a
  // pick sets state rather than typing, so no change event fires, and a form
  // that saves as you go (onboarding's AutosaveForm) listens for this.
  const firstPick = useRef(true);
  useEffect(() => {
    if (firstPick.current) {
      firstPick.current = false;
      return;
    }
    inputRef.current?.dispatchEvent(new CustomEvent(PLACE_PICKED, { bubbles: true }));
  }, [picked]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Open up or down depending on what the page (or a clipping hero) leaves.
  useLayoutEffect(() => {
    if (showList) setPlace(placePanel(inputRef.current, 256));
  }, [showList]);

  function select(s: LocationSuggestion) {
    const v = strict && s.postcode ? s.label : s.value;
    setPicked(v);
    setValue(v);
    onSelect?.(s);
    setOpen(false);
    setSuggestions([]);
  }

  /** Typed text that names exactly one suggestion, picked on the way out. */
  function exactMatch(): LocationSuggestion | null {
    const t = value.trim().toLowerCase().replace(/\s+/g, " ");
    if (!t) return null;
    const hits = visible.filter((s) => [s.label, s.value, s.suburb].some((x) => x.toLowerCase() === t));
    const byLabel = hits.filter((s) => s.label.toLowerCase() === t || s.value.toLowerCase() === t);
    if (byLabel.length === 1) return byLabel[0];
    return hits.length === 1 ? hits[0] : null;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + visible.length) % visible.length);
    } else if (e.key === "Enter" && (activeIndex >= 0 || strict)) {
      // Enter in a strict field takes the highlighted row, or the top one:
      // submitting text that can't be saved helps nobody.
      e.preventDefault();
      select(visible[Math.max(activeIndex, 0)]);
    }
  }

  const showHint = strict && touched && !open && value.trim() !== "" && !verified;

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <span className="relative block">
      <input
        ref={inputRef}
        id={id}
        name={strict ? undefined : name}
        value={value}
        required={required}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Rows keep focus on mousedown, so a blur means focus really left.
          setOpen(false);
          setTouched(true);
          if (strict && !verified) {
            const m = exactMatch();
            if (m) select(m);
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        style={strict ? { paddingRight: "2.5rem" } : undefined}
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={showHint || undefined}
        aria-describedby={showHint ? hintId : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {strict && name && <input type="hidden" name={name} value={verified ? value : ""} />}
      {strict && verified && (
        <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-accent">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
          </svg>
        </span>
      )}
      </span>
      {showHint && (
        <p id={hintId} className="mt-1.5 text-[13px] text-accent">
          Pick your suburb from the list.
        </p>
      )}
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          style={{ maxHeight: place.maxHeight }}
          className={`absolute left-0 right-0 z-30 overflow-auto rounded-[var(--radius-control)] border border-border bg-surface py-1 shadow-[0_12px_30px_rgba(31,58,46,0.12)] ${
            place.dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {visible.map((s, i) => (
            <li
              key={s.label}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(s)}
              className={`cursor-pointer px-3 py-2 text-left text-[15px] text-ink ${i === activeIndex ? "bg-accent-soft" : "hover:bg-shade"}`}
            >
              {s.postcode ? (
                <>
                  {s.suburb} <span className="text-subtle">{s.state} {s.postcode}</span>
                </>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
