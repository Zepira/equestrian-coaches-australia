"use client";

import { useState, useTransition } from "react";
import { setTakingStudents, type TakingStudents } from "./actions";

const OPTIONS: { k: TakingStudents; label: string }[] = [
  { k: "yes", label: "Yes" },
  { k: "waitlist", label: "Waitlist" },
  { k: "no", label: "Not now" },
];
const NOTE: Record<TakingStudents, string> = {
  yes: "Riders see a green “Taking new students” badge and the enquiry form.",
  waitlist: "Riders see “Waitlist open” and can still enquire — we'll tell them to expect a wait.",
  no: "Your profile stays live and findable, but the enquiry button reads “Not taking students right now”.",
};

/** The three-way segmented control (canvas: "Taking new students?"). Optimistic, then persisted. */
export function TakingStudentsControl({ value, compact = false }: { value: TakingStudents; compact?: boolean }) {
  const [current, setCurrent] = useState<TakingStudents>(value);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (k: TakingStudents) => {
    if (k === current) return;
    const prev = current;
    setCurrent(k);
    setError(null);
    start(async () => {
      try {
        await setTakingStudents(k);
      } catch (e) {
        setCurrent(prev);
        setError(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-1 rounded-[var(--radius-pill)] bg-shade p-1" role="radiogroup" aria-label="Taking new students?" data-pending={pending}>
        {OPTIONS.map((o) => (
          <button
            key={o.k}
            type="button"
            role="radio"
            aria-checked={current === o.k}
            onClick={() => pick(o.k)}
            className={`rounded-[var(--radius-pill)] font-medium transition-colors duration-[250ms] ${compact ? "py-2 text-[13px]" : "py-2.5 text-[14px]"} ${current === o.k ? "bg-ink text-ink-fg" : "bg-transparent text-ink"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-3 text-[13.5px] leading-[1.5] text-muted">{error ?? NOTE[current]}</p>}
      {compact && error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
