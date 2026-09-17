"use client";

import { useEffect, useId, useRef, useState } from "react";
import { placePanel } from "@/lib/anchored-panel";
import { Caret } from "@/components/ui/caret";
import { MenuSearch, matchedAlias, matches, shouldAutofocus } from "@/components/ui/menu-search";

// placePanel() trims this to the space the trigger's clipping ancestor
// actually leaves visible.
const PANEL_HEIGHT = 300;

/** `keywords` are search aliases the option also answers to (see menu-search.tsx). */
export type SelectOption = { value: string; label: string; keywords?: string[] };

/**
 * A styled single-select to replace a native <select> wherever the dropdown
 * itself is part of the design. A native select's option list is drawn by the
 * OS, so it can't be given the palette, the radii or the type — on Windows
 * Chrome it lands as a grey system list in the middle of a warm cream card.
 *
 * The panel opens with a search field at the top that narrows the list as
 * you type (a substring match, so "jump" finds Show Jumping). It's the
 * combobox pattern: the field owns focus and aria-activedescendant, Up/Down/
 * Home/End move the highlight, Enter picks it, Escape closes and returns
 * focus to the trigger. Typing a letter on the closed trigger opens the menu
 * with that letter already in the field.
 *
 * The panel is absolutely positioned, so opening it never reflows anything
 * around it, and it flips above the trigger when there isn't room below.
 *
 * It renders no form control of its own — callers that need to work without
 * JavaScript keep a real <select> alongside it (see SearchBar's `.nojs-only`).
 */
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Any",
  label,
  searchPlaceholder = "Search…",
  className = "",
  triggerClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown on the trigger when `value` is "" — the empty/any choice. */
  placeholder?: string;
  /** Accessible name for the control. */
  label: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ dropUp: false, maxHeight: PANEL_HEIGHT });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const all: SelectOption[] = [{ value: "", label: placeholder }, ...options];
  const current = all.find((o) => o.value === value) ?? all[0];
  const visible = query ? all.filter((o) => matches(o.label, query, o.keywords)) : all;

  // Close on an outside press. Deliberately not on scroll: the panel is
  // absolutely positioned against the trigger's own box, so it travels with
  // it and never needs dismissing to stay anchored.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function openMenu(seed = "") {
    // Measured at the moment of opening rather than tracked continuously:
    // 19 disciplines is a tall panel, and near the bottom of a phone
    // viewport — or of the hero, which clips — it would otherwise open
    // somewhere it can't be seen.
    setPlace(placePanel(triggerRef.current, PANEL_HEIGHT));
    setQuery(seed);
    const list = seed ? all.filter((o) => matches(o.label, seed, o.keywords)) : all;
    const selected = list.findIndex((o) => o.value === value);
    setActiveIndex(list.length === 0 ? -1 : seed ? 0 : Math.max(0, selected));
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(index: number) {
    const o = visible[index];
    if (!o) return;
    onChange(o.value);
    close(true);
  }

  function onQueryChange(next: string) {
    setQuery(next);
    const list = next ? all.filter((o) => matches(o.label, next, o.keywords)) : all;
    setActiveIndex(list.length ? 0 : -1);
  }

  // Shared by the trigger (closed) and the search field (open).
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openMenu(e.key);
      }
      return;
    }
    const n = visible.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (n) setActiveIndex((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (n) setActiveIndex((i) => (i - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(n ? 0 : -1);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(n - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={label}
        className={triggerClassName}
      >
        <span className={`truncate ${value ? "" : "text-subtle"}`}>{current.label}</span>
        <Caret
          className={`ml-2 h-[1.1em] w-[1.1em] shrink-0 text-subtle transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          style={{ maxHeight: place.maxHeight }}
          className={`menu-panel absolute left-0 z-30 flex min-w-full flex-col overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface shadow-[0_18px_40px_rgba(31,58,46,0.18)] ${
            place.dropUp ? "menu-panel--up bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <MenuSearch
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            autoFocus={shouldAutofocus()}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            aria-label={`${label} — type to filter`}
          />
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="menu-panel__list min-h-0 flex-1 overflow-auto py-1.5"
          >
            {visible.length === 0 && (
              <li className="px-3.5 py-2.5 text-[14px] text-subtle" aria-live="polite">
                No matches for &ldquo;{query}&rdquo;
              </li>
            )}
            {visible.map((o, i) => {
              const isSelected = o.value === value;
              const via = query ? matchedAlias(o.label, query, o.keywords) : null;
              return (
                <li key={o.value || "__any__"} id={`${listboxId}-${i}`} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => choose(i)}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-[15px] transition-colors duration-150 ${
                      i === activeIndex ? "bg-shade" : ""
                    } ${isSelected ? "font-medium text-accent" : "text-fg"}`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full transition-opacity duration-150 ${
                        isSelected ? "bg-accent opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="truncate">{o.label}</span>
                    {via && <span className="ml-auto shrink-0 truncate pl-3 text-[12px] text-subtle">{via}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
