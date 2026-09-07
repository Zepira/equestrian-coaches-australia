"use client";

import { useRef, type ReactNode } from "react";

// Wraps a single call-to-action so it pulls gently toward the pointer on
// hover and springs back on leave — a small, deliberately rare touch used
// on one or two real moments of decision (list a profile, follow through
// on the coach CTA), not sprinkled across every button in the app. Mouse-
// only by nature (touch has no hover to react to), and the CSS transition
// that springs it back already respects the site-wide reduced-motion
// reset in globals.css, so there's nothing extra to opt out of here.
export function Magnetic({
  children,
  strength = 0.25,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  /** Merged with the wrapper's own layout classes — needed whenever the
   *  wrapped button itself relies on its parent for width (e.g. `w-full`
   *  on mobile), since an inline-block span otherwise shrinks to fit. */
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  function handleMove(e: React.MouseEvent<HTMLSpanElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`inline-block transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
    </span>
  );
}
