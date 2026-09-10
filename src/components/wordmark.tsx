/**
 * The brand mark: "ECA" set in Instrument Serif, weight 400, tight
 * letter-spacing. 26px in the phone header, 30px on desktop, 40–48px in the
 * footer. Inherits `currentColor` so it takes its lockup's tone — cream over
 * a photograph or on ink, hunter green on cream. Always rendered with an
 * accessible name on the enclosing link, since three letters alone don't
 * carry the business name.
 */
export function Wordmark({
  size = 30,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`font-display font-normal leading-none ${className}`}
      style={{ fontSize: size, letterSpacing: size >= 40 ? "-0.02em" : "-0.01em" }}
    >
      ECA
    </span>
  );
}
