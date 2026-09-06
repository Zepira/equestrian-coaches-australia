"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Fades a section up into place the first time it scrolls into view. Server-
// rendered content stays fully visible in the initial HTML either way — the
// "hidden" state only ever exists as a CSS class, and .reveal itself is
// forced back to opacity: 1 for prefers-reduced-motion and no-JS (see the
// <noscript> override in layout.tsx) — a rider whose JS fails to hydrate,
// or a crawler that doesn't run it, still gets the real content up front,
// never content permanently stuck at opacity: 0.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Stagger, in ms — for a row of siblings revealing in sequence. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // threshold: 0 + a generous bottom rootMargin — this is a "settle into
    // place shortly after it's on screen" effect, not a scroll-scrubbed
    // reveal that makes a rider wait for content to arrive.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
