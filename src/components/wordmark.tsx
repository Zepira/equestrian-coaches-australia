import { BrandMark } from "@/components/brand-mark";

/**
 * The brand lockup: the horse head beside "Equine Professionals" set in
 * Instrument Serif, with "AUSTRALIA" in small tracked capitals underneath.
 * The head spans both lines. Inherits `currentColor` so it takes its
 * lockup's tone: cream over a photograph or on ink, ink on cream. Always
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
        <BrandMark height={Math.round(size * 1.55)} />
        <span className="flex flex-col">
          <span
            className="whitespace-nowrap font-display font-normal leading-none"
            style={{ letterSpacing: size >= 40 ? "-0.02em" : "-0.01em" }}
          >
            Equine Professionals
          </span>
          <span
            className="mt-[0.2em] whitespace-nowrap font-sans font-medium uppercase leading-none opacity-75"
            // 9px floor so the phone header's line stays legible.
            style={{ fontSize: `max(9px, 0.4em)`, letterSpacing: "0.26em" }}
          >
            Australia
          </span>
        </span>
      </span>
    </span>
  );
}
