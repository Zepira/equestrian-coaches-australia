"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type NavDropdownItem = {
  href: string;
  label: string;
  /** Second line under the label, desktop menu only. */
  note?: string;
};

/**
 * A header navigation menu: a link to the section's own page, plus a
 * full-width sub-menu bar that appears under the header with every
 * subcategory in one row (the Horse Deals pattern). Desktop only: the phone menu renders
 * the same items as a flat list inside the burger panel, where a nested
 * dropdown would be a worse way to reach the same eight links.
 *
 * The label is a real link (clicking "Coaches" goes to /coaches). The bar
 * opens when a mouse hovers the item and closes a moment after it leaves.
 * The item's wrapper runs the full height of the header and is not
 * positioned, so the bar (its child) hangs from the header itself: flush
 * under it, full width, and still inside the wrapper for hover purposes. Touch and keyboard
 * don't hover, so a small caret button beside the label toggles the panel
 * for them. Closes on Escape (focus returns to the caret), on a click
 * outside, and when focus leaves the menu entirely.
 *
 * The bar is always an opaque surface with ink text, and while it is open an
 * overlay header goes solid too (globals.css), so nothing sits on the photo.
 */
/** How long the panel stays after the mouse leaves, so a diagonal path into it doesn't close it. */
const CLOSE_DELAY = 220;
const OPEN_EVENT = "navdropdown:open";

export function NavDropdown({
  label,
  href,
  items,
  current = false,
}: {
  label: string;
  /** Where the label itself goes. */
  href: string;
  items: NavDropdownItem[];
  /** True when the current route belongs to this menu's section. */
  current?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const wrap = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while a mouse is over the item, so a click on the caret then keeps
  // the hover-opened panel open instead of toggling it shut.
  const hovering = useRef(false);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  useEffect(() => cancelClose, []);

  // Only one menu open at a time: opening this one tells the others to close
  // at once, rather than waiting out their hover close delay.
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: panelId }));
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== panelId) {
        cancelClose();
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, [open, panelId]);

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
      className="flex h-[var(--header-h)] items-center"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = true;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = false;
        cancelClose();
        closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
      }}
      onBlur={(e) => {
        // relatedTarget is where focus is going; null means it left the
        // document entirely (a click on chrome), which is not a reason to close.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Link
        href={href}
        className="site-header__link"
        aria-current={current ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
      <button
        type="button"
        className="site-header__link -mr-1.5 ml-0.5 flex h-7 w-6 items-center justify-center"
        aria-label={`${label} menu`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          // A close still pending from a mouse leaving must not undo this.
          cancelClose();
          setOpen((v) => (hovering.current ? true : !v));
        }}
      >
        <span
          aria-hidden
          className="text-[10px] leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div id={panelId} className="site-header__subbar" role="group" aria-label={label}>
          <ul className="site-header__subbar-inner">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="site-header__subbar-link"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
