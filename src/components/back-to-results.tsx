"use client";

import { useRouter } from "next/navigation";

/**
 * "← Results" / "← Back to results". Goes back in history when the rider
 * arrived from a search on this site (so their filters, radius and scroll
 * survive), otherwise to /search.
 */
export function BackToResults({ label = "Results", className = "" }: { label?: string; className?: string }) {
  const router = useRouter();
  return (
    <a
      href="/search"
      onClick={(e) => {
        if (typeof document !== "undefined" && /\/search(\?|$)/.test(document.referrer) && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={className}
    >
      <span aria-hidden>←</span> {label}
    </a>
  );
}
