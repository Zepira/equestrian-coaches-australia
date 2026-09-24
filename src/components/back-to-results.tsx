"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * "← Results" / "← Back to results". Goes back in history when the visitor
 * arrived from a results page on this site (so their filters, radius and
 * scroll survive), otherwise to `fallback`: the coach search by default, the
 * horse care search on a professional's profile.
 */
export function BackToResults({
  label = "Results",
  className = "",
  fallback = "/search",
  from = String.raw`/search(\?|$)`,
}: {
  label?: string;
  className?: string;
  fallback?: string;
  /** RegExp source for referrers that count as "results", i.e. worth going back to. */
  from?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (typeof document !== "undefined" && new RegExp(from).test(document.referrer) && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={className}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
