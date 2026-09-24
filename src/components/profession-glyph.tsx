/**
 * Line glyphs, one per profession (Claude Design, "Two Front Doors").
 * 24px grid, 1.75 stroke, round caps and joins, drawn in `currentColor` so
 * each takes the accent of the door it sits in: terracotta for coaches,
 * steel for horse care.
 *
 * The design drew seven (helmet, horseshoe, tooth, hands, saddle,
 * stethoscope, spine). Physiotherapists and nutritionists are on the site
 * but not in the design, so they get a bone and a grain stalk on the same
 * grid and weight.
 *
 * Decorative: always beside the profession's name, so aria-hidden.
 */
export const GLYPHS = {
  coaches: "M4 13a8 8 0 0 1 16 0v.5H4z M2.5 13.5h19 M8.5 13.5v1.5a3.5 3.5 0 0 0 7 0v-1.5 M12 5v3.5",
  farriers: "M7 20v-8.5a5 5 0 0 1 10 0V20 M5 20h4 M15 20h4 M8.5 10.5h.01 M15.5 10.5h.01 M7.5 15.5h.01 M16.5 15.5h.01",
  dentists:
    "M12 4.5c-1.6 0-2.4-1.2-4.2-1.2C5.6 3.3 4.5 5 4.5 7.5c0 3.5 1.8 5.5 2.6 11 .2 1.4 1.7 1.5 2.1.2L10.5 14h3l1.3 4.7c.4 1.3 1.9 1.2 2.1-.2.8-5.5 2.6-7.5 2.6-11 0-2.5-1.1-4.2-3.3-4.2-1.8 0-2.6 1.2-4.2 1.2z",
  bodyworkers:
    "M7 21v-5.5a2.5 2.5 0 0 1 2.5-2.5 M7 15.5 4.5 12.5 M9.5 13V6a1.5 1.5 0 0 1 3 0v6 M12.5 12V4.5a1.5 1.5 0 0 1 3 0V12 M15.5 12V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6H9",
  "saddle-fitters":
    "M3.5 8.5c3 0 5.5 2 6.5 5h4c1-3 3.5-5 6.5-5 M3.5 8.5v5.5c0 2 1.2 3 3 3h1.5 M20.5 8.5v5.5c0 2-1.2 3-3 3H16 M10 13.5c0 3 .9 4.5 2 4.5s2-1.5 2-4.5",
  vets: "M5 3v5.5a7 7 0 0 0 14 0V3 M12 15.5v1.5a4 4 0 0 0 8 0v-1.5 M20 13.5a1.75 1.75 0 1 0 .01 0",
  chiropractors: "M12 3v18 M8.5 6.5h7 M8 10.5h8 M8 14.5h8 M8.5 18.5h7",
  // Not in the design: a bone, for rehabilitation and movement work.
  // Shape from Lucide's "bone" (ISC licence, lucide.dev).
  physiotherapists:
    "M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5z",
  // Not in the design: a stalk of grain.
  nutritionists:
    "M12 21V7.5 M12 7.5c0-1.9.8-3.2 2.4-3.9.1 1.9-.8 3.2-2.4 3.9z M12 12.5c-1.9 0-3.2-.8-3.8-2.5 1.9-.1 3.2.8 3.8 2.5z M12 12.5c1.9 0 3.2-.8 3.8-2.5-1.9-.1-3.2.8-3.8 2.5z M12 17c-1.9 0-3.2-.8-3.8-2.5 1.9-.1 3.2.8 3.8 2.5z M12 17c1.9 0 3.2-.8 3.8-2.5-1.9-.1-3.2.8-3.8 2.5z",
} as const;

export type GlyphKey = keyof typeof GLYPHS;

export function hasGlyph(slug: string): slug is GlyphKey {
  return slug in GLYPHS;
}

export function ProfessionGlyph({ slug, size = 24, className = "" }: { slug: GlyphKey; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <path d={GLYPHS[slug]} />
    </svg>
  );
}
