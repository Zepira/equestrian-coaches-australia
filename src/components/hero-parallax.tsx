"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll parallax, mounted once in the root layout. Two modes, both off
 * under reduced motion and both rAF-throttled:
 *
 *   data-parallax          the canvases' hero rule — the element is
 *   (or "hero")            translated by min(scrollY × 0.28, 260px), so a
 *                          full-bleed hero photo drifts slower than the
 *                          content over it. Saturates 930px down the page,
 *                          which is why it only ever suits the hero.
 *
 *   data-parallax="drift"  viewport-relative: the element slides by
 *                          (its centre − the viewport centre) × −speed,
 *                          clamped to ±max, so every photograph on the
 *                          page moves as it passes through the viewport.
 *                          `data-parallax-speed` (default 0.12) and
 *                          `data-parallax-max` (default 70px) tune it. Pair
 *                          with `.parallax-drift` (scale 1.12) inside an
 *                          overflow-hidden frame so the edges never show.
 *
 * Elements are re-collected on every route change; the transform is
 * cleared on unmount so nothing is left stuck.
 */
export function Parallax() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (els.length === 0) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      const heroY = Math.min(window.scrollY * 0.28, 260);
      for (const el of els) {
        if (el.dataset.parallax === "drift") {
          // Measure the frame around the element, not the element: its own
          // rect already carries last frame's translate, which would feed
          // back into the next value.
          const r = (el.parentElement ?? el).getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue; // display:none responsive twin
          const speed = Number(el.dataset.parallaxSpeed ?? 0.12);
          const max = Number(el.dataset.parallaxMax ?? 70);
          const y = Math.max(-max, Math.min(max, (vh / 2 - (r.top + r.height / 2)) * speed));
          el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(var(--parallax-scale, 1))`;
        } else {
          el.style.transform = `translate3d(0, ${heroY}px, 0)`;
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      for (const el of els) el.style.transform = "";
    };
  }, [pathname]);

  return null;
}

/** Older name, still imported in a couple of places. */
export const HeroParallax = Parallax;
