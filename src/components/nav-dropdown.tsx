"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type NavDropdownItem = {
  href: string;
  label: string;
  /** Second line under the label, desktop menu only. */
  note?: string;
};

/**
 * A header navigation menu: a button that drops a panel of links beneath the
 * bar. Desktop only — the phone menu renders the same items as a flat list
 * inside the burger panel, where a nested dropdown would be a worse way to
 * reach the same eight links.
 *
 * Opens on click rather than hover, so it works the same for a pointer, a
 * keyboard and a touch screen, and cannot open by accident when the cursor
 * crosses the bar. Closes on Escape, on a click outside, and when focus
 * leaves the menu entirely (tabbing past the last link), which is what makes
 * it usable without a mouse.
 *
 * The panel is always a cream surface with ink text, whatever tone the header
 * itself is wearing: over the hero photograph the bar is transparent, and a
 * panel inheriting that would put links straight onto the photo.
 */
/** Kept clear of the window edge by this much. */
const GUTTER = 12;

export function NavDropdown({
  label,
  items,
  current = false,
}: {
  label: string;
  items: NavDropdownItem[];
  /** True when the current route belongs to this menu's section. */
  current?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Escape should land the caret back on the button, not nowhere.
        wrap.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        // relatedTarget is where focus is going; null means it left the
        // document entirely (a click on chrome), which is not a reason to close.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="site-header__link flex items-center gap-1.5"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-current={current ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span
          aria-hidden
          className="text-[10px] leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="site-header__panel"
          role="group"
          aria-label={label}
          // The panel hangs from the button's left edge, which pushes the
          // right-most menu off-screen on a narrow desktop window. Measured
          // and nudged back on mount — imperatively, via the ref rather than
          // state, so there is no second render and nothing to flash.
          ref={(el) => {
            if (!el) return;
            el.style.left = "";
            const rect = el.getBoundingClientRect();
            const overflow = rect.right - (window.innerWidth - GUTTER);
            if (overflow > 0) el.style.left = `${-12 - overflow}px`;
          }}
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[10px] px-3 py-2 transition-colors duration-200 hover:bg-shade"
                >
                  <span className="block text-[15px] font-medium text-ink">{item.label}</span>
                  {item.note && <span className="mt-0.5 block text-[13px] leading-[1.35] text-subtle">{item.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
