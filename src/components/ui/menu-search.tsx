"use client";

import type { ComponentProps } from "react";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Case- and accent-insensitive substring match on the label — "jump" finds
 * Show Jumping — or on any of the option's search aliases, so "xc" finds
 * Eventing through its "xc coaching" alias. Same vocabulary the SEO pages
 * use (term_aliases), so what a rider types into a menu and what they type
 * into Google both land on the same term.
 */
export function matches(label: string, query: string, keywords: string[] = []) {
  const q = norm(query);
  if (!q) return true;
  return norm(label).includes(q) || keywords.some((k) => norm(k).includes(q));
}

/** The alias that carried a match when the label itself didn't — shown as
 *  a hint next to the option so the rider sees why it appeared. */
export function matchedAlias(label: string, query: string, keywords: string[] = []) {
  const q = norm(query);
  if (!q || norm(label).includes(q)) return null;
  return keywords.find((k) => norm(k).includes(q)) ?? null;
}

/**
 * Whether a menu's search field should take focus the moment the panel
 * opens. Yes with a mouse or keyboard; no on a touch screen, where focusing
 * an input raises the on-screen keyboard over the very list the rider was
 * about to tap. The field is still there to tap into.
 */
export function shouldAutofocus() {
  return typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
}

/**
 * The search field that sits at the top of a menu panel (SelectMenu,
 * MultiSelectMenu). Not a form control — it filters the list under it and
 * submits nothing. A hairline under it separates it from the scrolling
 * list; the field itself never scrolls away.
 */
export function MenuSearch({
  value,
  onChange,
  className = "",
  ...rest
}: Omit<ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className={`relative shrink-0 border-b border-border ${className}`}>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.2 13.2 17 17" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        className="w-full bg-transparent py-2.5 pl-10 pr-3.5 text-[15px] text-fg outline-none placeholder:text-subtle"
        {...rest}
      />
    </div>
  );
}
