"use client";

import { useEffect, useState } from "react";

// Counts up from 0 to `value` once on mount — used for the hero's numeric
// stat ("19 disciplines listed"), which is already on screen at first
// paint rather than scrolled into view, so this animates on load rather
// than through the Reveal/IntersectionObserver pattern the rest of the
// site uses for below-the-fold content.
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // Initial state is already `value` (see useState above), so a
    // reduced-motion visitor needs no update here at all — just skip
    // the count-up animation entirely and leave the final number shown.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // No synchronous setDisplay(0) here — react-hooks/set-state-in-effect
    // flags any direct setState call in an effect body. Not needed anyway:
    // the first requestAnimationFrame tick below runs at progress 0, which
    // already computes and sets display to 0 before the count-up proceeds.
    let raf = 0;
    let start: number | null = null;

    function tick(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}
