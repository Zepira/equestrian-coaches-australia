"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const COACH_RESULTS = String.raw`/(search|coaches)(/|\?|$)`;

/**
 * "← Results" / "← Back to results". Goes back in history when the visitor
 * arrived from a results page on this site (so their filters, radius and
 * scroll survive), otherwise to `fallback`: the coach search by default, the
 * horse care search on a professional's profile.
 *
 * `fromPage` (the header's copy) takes both from the page's PageContext
 * marker at click time instead, because one header serves every profile.
 */
export function BackToResults({
  label = "Results",
  className = "",
  fallback = "/search",
  from = COACH_RESULTS,
  fromPage = false,
}: {
  label?: string;
  className?: string;
  fallback?: string;
  /** RegExp source for referrers that count as "results", i.e. worth going back to. */
  from?: string;
  fromPage?: boolean;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (typeof document === "undefined") return;
        const marker = fromPage ? document.querySelector<HTMLElement>("[data-page-context]") : null;
        const pattern = marker?.dataset.resultsFrom || from;
        const target = marker?.dataset.resultsHref || fallback;
        if (new RegExp(pattern).test(document.referrer) && window.history.length > 1) {
          e.preventDefault();
          router.back();
        } else if (target !== fallback) {
          e.preventDefault();
          router.push(target);
        }
      }}
      className={className}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
