"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { placePanel } from "@/lib/anchored-panel";
import { Caret } from "@/components/ui/caret";

// Tall enough for a couple of groups; placePanel() trims it to whatever the
// trigger's clipping ancestor actually leaves visible.
const PANEL_HEIGHT = 320;

export type TermOption = { slug: string; name: string };
export type TermGroup = { heading: string; options: TermOption[] };

/**
 * The "Skills & setup" picker: one pill that opens a panel of grouped
 * checkboxes. Skills (what a coach helps you fix) and attributes (how they
 * work) share a panel because a rider doesn't think of them as two
 * taxonomies — the headings are enough.
 *
 * Picks are held in a draft and only handed to `onApply` when the panel
 * closes — outside press, Escape, or the Apply button. That matters in both
 * places it's used, for different reasons: on /search a live-applying
 * checkbox would reload the results under the rider mid-pick, and in the
 * hero it would navigate away from the page after their first tick.
 *
 * Like SelectMenu, the panel is absolutely positioned, so opening it never
 * reflows the row it sits in.
 */
export function MultiSelectMenu({
  label,
  groups,
  selected,
  onApply,
  triggerClassName,
  panelAlign = "left",
  className = "",
}: {
  label: string;
  groups: TermGroup[];
  selected: string[];
  onApply: (next: string[]) => void;
  triggerClassName: string;
  /** Which edge the panel hangs from — `right` keeps it on screen for a
   *  trigger sitting near the right of its container. */
  panelAlign?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ dropUp: false, maxHeight: PANEL_HEIGHT });
  const [draft, setDraft] = useState<string[]>(selected);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Commit on close rather than per tick, and only when something actually
  // changed — an opened-and-dismissed panel must not push a new URL.
  const commit = useCallback(() => {
    setOpen(false);
    const changed = draft.length !== selected.length || draft.some((v) => !selected.includes(v));
    if (changed) onApply(draft);
  }, [draft, selected, onApply]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) commit();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        commit();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, commit]);

  function openPanel() {
    setPlace(placePanel(triggerRef.current, PANEL_HEIGHT));
    // Resync the draft here, in the handler, rather than in an effect keyed
    // on `open` — the same react-hooks/set-state-in-effect shape earlier
    // phases hit, and it reads better anyway: the draft starts from whatever
    // is committed at the moment the rider opens the panel.
    setDraft(selected);
    setOpen(true);
  }

  const count = selected.length;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? commit() : openPanel())}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={triggerClassName}
      >
        <span className="truncate">{label}</span>
        {count > 0 && (
          <span className="ml-1.5 shrink-0 rounded-[var(--radius-pill)] bg-accent px-[7px] py-px text-[11px] font-semibold text-accent-fg">
            {count}
          </span>
        )}
        <Caret className={`ml-1.5 h-[1.15em] w-[1.15em] shrink-0 transition-transform duration-200 ${open ? "-rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          style={{ maxHeight: place.maxHeight }}
          className={`menu-panel absolute z-30 flex w-[min(320px,calc(100vw-36px))] flex-col overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface shadow-[0_18px_40px_rgba(31,58,46,0.18)] ${
            place.dropUp ? "menu-panel--up bottom-full mb-1.5" : "top-full mt-1.5"
          } ${panelAlign === "right" ? "right-0" : "left-0"}`}
        >
          {/* The list scrolls; the actions don't. A `sticky` footer inside
              one scrolling box leaves the last row peeking out under it,
              because the scroll content still extends past the bar. */}
          <div className="menu-panel__list min-h-0 flex-1 overflow-auto p-3">
            {groups.map((group) => (
            <div key={group.heading} className="mb-3 last:mb-0">
              <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                {group.heading}
              </p>
              <div className="flex flex-col">
                {group.options.map((o) => {
                  const on = draft.includes(o.slug);
                  return (
                    <label
                      key={o.slug}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-1.5 py-[7px] text-[15px] text-fg transition-colors duration-150 hover:bg-shade"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDraft((d) => (d.includes(o.slug) ? d.filter((v) => v !== o.slug) : [...d, o.slug]))
                        }
                        className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                      />
                      <span>{o.name}</span>
                    </label>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
            <button
              type="button"
              onClick={() => setDraft([])}
              className="text-[13px] font-medium text-subtle underline-offset-2 hover:text-fg hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                commit();
                triggerRef.current?.focus();
              }}
              className="rounded-[var(--radius-pill)] bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-ink-fg transition-colors duration-200 hover:bg-ink-card"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
