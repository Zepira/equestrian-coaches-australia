"use client";

import { useEffect } from "react";

// A few pixels of depth on the hero photo as the page scrolls — the photo
// drifts slightly slower than the page, which is what makes it read as
// sitting behind the content rather than printed on the same plane as it.
// Renders nothing itself; it reaches into `.hero__media` directly rather
// than taking a ref, because `Hero` (src/components/hero.tsx) is a server
// component and this is the one piece of it that has to be client-side.
//
// Deliberately NOT a transform on `.hero__img` itself — that element
// already carries the `ken-burns` CSS animation (see globals.css), and an
// animation targeting `transform` always wins the cascade over anything
// set inline, so a scroll-driven transform there would simply be ignored.
// `.hero__media` (the `position: absolute; inset: 0` wrapper one level
// up) is free, and translating it stays visually seamless: `.hero`'s own
// background is the same ink green the scrim already fades to, so the
// sliver of edge this can expose is imperceptible against it.
export function HeroParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const media = document.querySelector<HTMLElement>(".hero__media");
    if (!media) return;

    let raf = 0;
    function apply() {
      raf = 0;
      // Capped, and only ever active while the hero itself is still
      // roughly on screen — no point computing this once the rider has
      // scrolled well past it.
      const y = Math.min(window.scrollY * 0.12, 48);
      media!.style.transform = `translate3d(0, ${y}px, 0)`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      media.style.transform = "";
    };
  }, []);

  return null;
}
