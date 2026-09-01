import { useEffect, useState } from "react";

const SCROLL_THRESHOLD_PX = 24;

/**
 * True once the page has scrolled past `SCROLL_THRESHOLD_PX`. Pass
 * `active: false` to skip attaching the listener entirely — used by the
 * header so pages without a transparent-over-hero state don't pay for a
 * scroll listener they never read the result of.
 */
export function useScrolled(active: boolean): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // No cleanup-only early return needed: when inactive, the caller never
    // reads `scrolled`, so a stale value from a previous page is harmless —
    // resetting it here would mean calling setState synchronously from the
    // effect body, which React flags.
    if (!active) return;

    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active]);

  return scrolled;
}
