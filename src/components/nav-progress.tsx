"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin accent line across the top while a page is on its way, so a click
 * on a slow page (a dashboard, a search) never looks like it did nothing.
 * It starts on a click of an internal link and on the browser's back and
 * forward, creeps towards the end while waiting, and finishes when the new
 * address renders. Clicks that won't navigate here (a new tab, a download,
 * another site, the same page) don't start it, and a cap stops it hanging
 * if a navigation never lands. Styles: .nav-progress in globals.css.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const active = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const start = () => {
      if (active.current) return;
      active.current = true;
      clear();
      setVisible(true);
      setWidth(0.08);
      // Creep, slower the further it gets; it never reaches the end by itself.
      [[120, 0.3], [600, 0.55], [1500, 0.72], [3500, 0.86]].forEach(([ms, w]) => timers.current.push(window.setTimeout(() => setWidth(w), ms)));
      timers.current.push(window.setTimeout(() => finish(), 15000));
    };
    const finish = () => {
      if (!active.current) return;
      active.current = false;
      clear();
      setWidth(1);
      timers.current.push(window.setTimeout(() => setVisible(false), 250));
      timers.current.push(window.setTimeout(() => setWidth(0), 600));
    };
    const onClick = (e: MouseEvent) => {
      // Capture phase, before Next.js's Link handles the click (and cancels
      // the browser's own navigation, so defaultPrevented means nothing here).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target && a.target !== "_self" || a.hasAttribute("download")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin) return;
      // Same page, or only a jump to an anchor on it: nothing to wait for.
      if (to.pathname === location.pathname && to.search === location.search) return;
      start();
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    finishRef.current = finish;
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      clear();
    };
  }, []);

  // The new address has rendered: finish.
  useEffect(() => {
    finishRef.current();
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="nav-progress"
      style={{ transform: `scaleX(${width})`, opacity: visible ? 1 : 0 }}
    />
  );
}
