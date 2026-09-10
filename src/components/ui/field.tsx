import type { ReactNode } from "react";

/**
 * The Golden Hour text input and its uppercase label (canvas: every form —
 * 12px radius, hairline border, 15px text, 13px vertical padding, terracotta
 * focus ring). Pages without a canvas of their own (auth, clinic edit, admin)
 * share these so they can't drift from the ones that have one.
 */
export const inputClass =
  "w-full rounded-[12px] border border-border bg-surface px-3.5 py-[13px] text-[15px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none disabled:opacity-60";

export const labelClass = "mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle";

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint}
    </label>
  );
}
