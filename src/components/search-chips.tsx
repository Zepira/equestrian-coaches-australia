"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * The filter chips from the Search Results canvas — "filters are chips, not
 * a sidebar: one thumb can work them". URL-driven: each chip toggles one
 * value and pushes a new /search URL. Five map to attribute terms (`a`),
 * one to the taking-students column (`new=1`).
 */
export const CHIPS: { id: string; label: string; param: "a" | "new"; value: string }[] = [
  { id: "new", label: "Taking new students", param: "new", value: "1" },
  { id: "horses", label: "Horses available", param: "a", value: "horses-available" },
  { id: "remote", label: "Online lessons", param: "a", value: "online-coaching" },
  { id: "beginners", label: "Beginners welcome", param: "a", value: "beginners-welcome" },
  { id: "arena", label: "Indoor arena", param: "a", value: "indoor-arena" },
  { id: "weekend", label: "Weekends", param: "a", value: "weekend-availability" },
];

export function useChipState() {
  const params = useSearchParams();
  const router = useRouter();
  const attrs = new Set((params.get("a") ?? "").split(",").filter(Boolean));
  const isOn = (c: (typeof CHIPS)[number]) => (c.param === "new" ? params.get("new") === "1" : attrs.has(c.value));
  const toggle = (c: (typeof CHIPS)[number]) => {
    const next = new URLSearchParams(params.toString());
    if (c.param === "new") {
      if (next.get("new") === "1") next.delete("new");
      else next.set("new", "1");
    } else {
      const set = new Set(attrs);
      if (set.has(c.value)) set.delete(c.value);
      else set.add(c.value);
      if (set.size) next.set("a", Array.from(set).join(","));
      else next.delete("a");
    }
    next.delete("edit");
    router.push(`/search?${next.toString()}`);
  };
  return { params, isOn, toggle, push: (next: URLSearchParams) => router.push(`/search?${next.toString()}`) };
}

export function SearchChips({ className = "", rail = false }: { className?: string; rail?: boolean }) {
  const { isOn, toggle } = useChipState();
  return (
    <div
      className={`${rail ? "hs flex gap-2 overflow-x-auto" : "flex flex-wrap gap-2"} ${className}`}
      role="group"
      aria-label="Filters"
    >
      {CHIPS.map((c) => {
        const on = isOn(c);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(c)}
            className={`shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border px-[13px] py-2 text-[13px] font-medium transition-colors duration-200 wide:px-3.5 wide:py-[9px] ${
              on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface/90 text-fg"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
