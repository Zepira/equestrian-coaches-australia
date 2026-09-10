"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { LocationSuggestion } from "@/app/api/location-suggest/route";

// Suburb/postcode autocomplete for the search bar's "Suburb or postcode"
// field. Free text is still accepted and still submits — this only offers
// real suburb names as you type, so a typo gets corrected before it ever
// reaches resolveLocation() as a miss. Debounced fetch against
// /api/location-suggest, full keyboard support (arrow keys, Enter,
// Escape), click-outside close.
export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fires with the full suggestion (suburb/state/postcode split out), on
   *  top of the plain onChange(value) — for callers that need to fill
   *  sibling fields (e.g. the coach profile's separate suburb/state/
   *  postcode inputs), not just the combined "Suburb VIC" string. */
  onSelect?: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
  inputClassName: string;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounced fetch, cancelling any in-flight request so a fast typist
  // never has a stale slower response overwrite a newer one.
  useEffect(() => {
    const q = value.trim();
    const controller = new AbortController();
    // Every setState call — including the "too short, clear" case — stays
    // inside this timer callback rather than the effect body itself, so
    // none of them run synchronously during the render/effect phase (same
    // fix as the set-state-in-effect rule hit in earlier phases).
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { suggestions: LocationSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setActiveIndex(-1);
        })
        .catch(() => {
          // Aborted or offline — leave whatever suggestions were showing.
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(suggestion: LocationSuggestion) {
    onChange(suggestion.value);
    onSelect?.(suggestion);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        disabled={disabled}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-[var(--radius-control)] border border-border bg-surface py-1 shadow-[0_12px_30px_rgba(31,58,46,0.12)]"
        >
          {suggestions.map((s, i) => (
            <li key={s.label} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
                className={`block w-full px-3 py-2 text-left text-[15px] text-ink ${
                  i === activeIndex ? "bg-accent-soft" : "hover:bg-shade"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
