"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type AccountMenuProps = {
  name: string | null;
  email: string | null;
  isProvider: boolean;
  isAdmin: boolean;
  /** The provider's public profile, when they have one. */
  profileHref: string | null;
};

/**
 * The signed-in control in the header: one small initial in a ring, which
 * opens a short menu. It replaced an ink avatar, the first name and a
 * "Log out" button sitting side by side, which read as three separate
 * things and took more of the bar than the navigation did.
 *
 * The panel is always a cream card with ink text, whatever tone the bar is
 * wearing, so it reads the same over the hero photo and on the ink search
 * bar. Closes on Escape (focus back to the button), a click outside, and
 * any navigation.
 */
export function AccountMenu({ name, email, isProvider, isAdmin, profileHref }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  // A navigation closes the menu. Keyed on the path, compared during render
  // rather than in an effect, so there's no set-state-in-effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase() || "?";
  const item = "block rounded-[8px] px-3 py-2 text-[14.5px] text-ink transition-colors hover:bg-shade";

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Your account"
        className="site-header__account"
      >
        <span aria-hidden className="site-header__account-initial">{initial}</span>
        <svg aria-hidden viewBox="0 0 12 12" className={`size-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="site-header__account-panel" role="group" aria-label="Your account">
          <div className="border-b border-border px-3 pb-2.5 pt-1">
            {name && <p className="truncate text-[14.5px] font-semibold text-ink">{name}</p>}
            {email && <p className="truncate text-[13px] text-subtle">{email}</p>}
          </div>
          <ul className="flex flex-col py-1.5">
            <li>
              <Link href={isProvider ? "/dashboard" : "/account"} className={item} onClick={() => setOpen(false)}>
                {isProvider ? "Dashboard" : "My account"}
              </Link>
            </li>
            {isProvider && profileHref && (
              <li>
                <Link href={profileHref} className={item} onClick={() => setOpen(false)}>
                  View my public profile
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/admin" className={item} onClick={() => setOpen(false)}>
                  Admin
                </Link>
              </li>
            )}
          </ul>
          <form action="/auth/sign-out" method="post" className="border-t border-border pt-1.5">
            <button type="submit" className={`${item} w-full text-left text-muted`}>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
