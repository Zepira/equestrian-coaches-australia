"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The canvases' `[data-reveal]` scroll-in: a block starts 20px (24px on
 * desktop) low at opacity 0 and settles over .9s once 12% of it is on
 * screen — one IntersectionObserver per block, fires once. Styles live in
 * globals.css (`[data-reveal]` / `[data-reveal="in"]`).
 *
 * Server-rendered content is always in the HTML; the hidden state is CSS
 * only, and both the <noscript> override in layout.tsx and the reduced-
 * motion reset force it visible when JS doesn't run — real content never
 * stays at opacity 0.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.reveal = "in";
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // @ts-expect-error — ref typed for the union; both tags accept HTMLElement refs
  return <Tag ref={ref} data-reveal className={className}>{children}</Tag>;
}
