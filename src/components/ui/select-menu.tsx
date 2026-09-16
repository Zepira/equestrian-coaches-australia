"use client";

import { useEffect, useId, useRef, useState } from "react";
import { placePanel } from "@/lib/anchored-panel";

// placePanel() trims this to the space the trigger's clipping ancestor
// actually leaves visible.
const PANEL_HEIGHT = 260;

export type SelectOption = { value: string; label: string };

/**
 * A styled single-select to replace a native <select> wherever the dropdown
 * itself is part of the design. A native select's option list is drawn by the
 * OS, so it can't be given the palette, the radii or the type — on Windows
 * Chrome it lands as a grey system list in the middle of a warm cream card.
 *
 * The panel is absolutely positioned, so opening it never reflows anything
 * around it, and it flips above the trigger when there isn't room below.
 * Keyboard support matches the native control closely enough to be a fair
 * swap: Up/Down/Home/End move, Enter/Space select, Escape closes and returns
 * focus, and typing a letter jumps to the next option starting with it.
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
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ dropUp: false, maxHeight: PANEL_HEIGHT });
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });
  const listboxId = useId();

  const all: SelectOption[] = [{ value: "", label: placeholder }, ...options];
  const selectedIndex = all.findIndex((o) => o.value === value);
  const current = selectedIndex >= 0 ? all[selectedIndex] : all[0];

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

  function openMenu(startAt = selectedIndex < 0 ? 0 : selectedIndex) {
    // Measured at the moment of opening rather than tracked continuously:
    // 19 disciplines is a tall panel, and near the bottom of a phone
    // viewport — or of the hero, which clips — it would otherwise open
    // somewhere it can't be seen.
    setPlace(placePanel(triggerRef.current, PANEL_HEIGHT));
    setActiveIndex(startAt);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(all[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % all.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + all.length) % all.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(all.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") triggerRef.current?.focus();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.buffer = now - t.at > 800 ? e.key : t.buffer + e.key;
      t.at = now;
      const q = t.buffer.toLowerCase();
      const from = all.findIndex((o, i) => i > activeIndex && o.label.toLowerCase().startsWith(q));
      const hit = from >= 0 ? from : all.findIndex((o) => o.label.toLowerCase().startsWith(q));
      if (hit >= 0) setActiveIndex(hit);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={label}
        className={triggerClassName}
      >
        <span className={`truncate ${value ? "" : "text-subtle"}`}>{current.label}</span>
        <span
          aria-hidden
          className={`ml-2 shrink-0 text-[10px] leading-none text-subtle transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={{ maxHeight: place.maxHeight }}
          className={`menu-panel absolute left-0 z-30 min-w-full overflow-auto rounded-[var(--radius-input)] border border-border bg-surface py-1.5 shadow-[0_18px_40px_rgba(31,58,46,0.18)] ${
            place.dropUp ? "menu-panel--up bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {all.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value || "__any__"} id={`${listboxId}-${i}`} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[15px] transition-colors duration-150 ${
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
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
