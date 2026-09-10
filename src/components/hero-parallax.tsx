"use client";

import { useEffect } from "react";

/**
 * The canvases' `[data-parallax]`: every element carrying that attribute
 * is translated by min(scrollY × 0.28, 260px) as the page scrolls, so a
 * hero photograph drifts slower than the content over it. Renders nothing;
 * mount it once per page that has a `[data-parallax]` element (the hero
 * component does). rAF-throttled, off under reduced motion.
 */
export function Parallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (els.length === 0) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = Math.min(window.scrollY * 0.28, 260);
      for (const el of els) el.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      for (const el of els) el.style.transform = "";
    };
  }, []);

  return null;
}

/** Back-compat name while hero.tsx is rebuilt in Phase R2. */
export const HeroParallax = Parallax;
