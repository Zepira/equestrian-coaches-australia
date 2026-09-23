import { BrandMark } from "@/components/brand-mark";

/**
 * The brand lockup: the horse mark beside "Equine Professionals" set in
 * Instrument Serif. The mark sits a little taller than the cap height so the
 * horse reads at header size. Inherits `currentColor` so it takes its
 * lockup's tone — cream over a photograph or on ink, ink on cream. Always
 * rendered inside a link with an accessible name, since the mark and text
 * are aria-hidden here.
 */
export function Wordmark({
  size = 30,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // Display lives on the inner span so callers can pass `hidden md:block`
    // without two display utilities fighting on one element.
    <span aria-hidden className={className} style={{ fontSize: size }}>
      <span className="inline-flex items-center gap-[0.34em]">
        <BrandMark height={Math.round(size * 1.05)} className="-mt-[0.08em]" />
        <span
          className="whitespace-nowrap font-display font-normal leading-none"
          style={{ letterSpacing: size >= 40 ? "-0.02em" : "-0.01em" }}
        >
          Equine Professionals
        </span>
      </span>
    </span>
  );
}
