"use client";

import { useEffect, useRef, useState } from "react";
import { pillToggleClassName } from "@/lib/pill-styles";

export type PillDropdownGroup = {
  key: string;
  heading?: string;
  options: { value: string; label: string }[];
};

// A single filter pill that opens into a checkbox panel — the "pill
// dropdown" pattern, replacing what used to be every option rendered flat
// as its own always-visible pill (correct but overwhelming once a facet
// has 20+ options). Selections are held as an uncommitted draft while the
// panel is open — nothing navigates or re-fetches mid-pick — and only
// handed to the caller via onApply when the panel closes (outside click,
// Escape, or the Apply button), so picking several boxes doesn't reload
// or reset the panel between clicks.
export function PillDropdown({
  label,
  groups,
  selected,
  onApply,
}: {
  label: string;
  groups: PillDropdownGroup[];
  selected: Record<string, string[]>;
  onApply: (next: Record<string, string[]>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selected);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync the draft to the committed selection at the moment the panel
  // opens (not via an effect keyed on `open` — that's a same-render
  // setState loop the react-hooks lint rule correctly flags) so a stale
  // pick from a previous open/close doesn't linger.
  function handleOpen() {
    setDraft(selected);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onApply(draft);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        onApply(draft);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft is read at close-time, doesn't need to retrigger the listener
  }, [open]);

  function toggle(groupKey: string, value: string) {
    setDraft((prev) => {
      const set = new Set(prev[groupKey] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [groupKey]: Array.from(set) };
    });
  }

  const committedCount = Object.values(selected).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-expanded={open}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${pillToggleClassName(committedCount > 0)}`}
      >
        {label}
        {committedCount > 0 && ` · ${committedCount}`}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-[var(--radius-tile)] border border-border bg-surface p-4 shadow-[0_16px_40px_rgba(31,58,46,0.16)]">
          <div className="flex max-h-72 flex-col gap-4 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.key}>
                {g.heading && (
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">
                    {g.heading}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  {g.options.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-[15px] text-fg">
                      <input
                        type="checkbox"
                        checked={(draft[g.key] ?? []).includes(opt.value)}
                        onChange={() => toggle(g.key, opt.value)}
                        className="accent-current"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDraft(Object.fromEntries(groups.map((g) => [g.key, []])))}
              className="text-sm text-muted hover:text-fg"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApply(draft);
              }}
              className="text-sm font-semibold text-accent hover:text-ink"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
