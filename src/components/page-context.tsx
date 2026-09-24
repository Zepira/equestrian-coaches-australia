/**
 * What a page tells the site header about itself when the URL alone can't:
 * /profile/[slug] holds coaches and horse care professionals alike, so the
 * door's colours and where "← Back to results" should go come from the
 * profile, not the path.
 *
 * One hidden marker. globals.css reads it with `html:has(...)`, so the
 * door's colours are right from the first paint with no script; the header
 * reads it after every navigation (src/components/site-header.tsx) to set
 * `data-door` for anything keyed on the attribute, and BackToResults reads
 * where results live.
 */
export function PageContext({
  door = null,
  resultsHref = "/search",
  resultsFrom,
}: {
  door?: "horse-care" | null;
  /** Where "Back to results" goes when the visitor didn't come from results. */
  resultsHref?: string;
  /** RegExp source for referrers that count as results (see BackToResults). */
  resultsFrom?: string;
}) {
  return (
    <span hidden data-page-context="" data-page-door={door ?? ""} data-results-href={resultsHref} data-results-from={resultsFrom ?? ""} />
  );
}
