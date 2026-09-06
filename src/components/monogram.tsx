/**
 * ECA monogram — the brand mark used in the header and footer lockups, and
 * (as flat SVG/PNG) for the favicon and app icon in src/app/.
 *
 * Plain bold serif letterforms, no box/border. Uses `currentColor`
 * (inherited, not set here), so it takes whatever tone its lockup is in —
 * ink on the cream header, cream on the ink footer, cream again over the
 * hero photograph. Always paired with the full name next to it (see
 * SiteHeader/SiteFooter) — it isn't legible enough alone to carry the name
 * on its own.
 */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`font-display text-[28px] font-bold leading-none tracking-tight ${className}`}>
      ECA
    </span>
  );
}
