import Link from "next/link";
import type { Discipline } from "@/lib/disciplines";
import { disciplinePhoto } from "@/lib/mock-coaches";

// The featured-disciplines masonry: one large tile (title + blurb, top-left,
// a small decorative accent shape in the clear corner) beside two smaller
// tiles stacked to match its height (title only, bottom-left). See
// `.tile-caption`/`.tile-top`/`.tile-bottom`/`.tile-accent` in globals.css —
// this is a different photo signature from the arch crop used elsewhere
// (CoachCard, the discipline pages): a full sharp-cornered rectangle with
// the caption directly on the photo, not underneath it.
export function DisciplineMasonry({ disciplines }: { disciplines: Discipline[] }) {
  const [big, med1, med2] = disciplines;
  if (!big || !med1 || !med2) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr] sm:grid-rows-2">
      <Link
        href={`/disciplines/${big.slug}`}
        className="tile-caption tile-top relative block h-64 sm:row-span-2 sm:h-auto"
      >
        <div className="tile-accent" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
        <img src={disciplinePhoto(big.slug)} alt={big.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="tile-caption__body absolute inset-x-0 top-0 p-6 sm:p-8">
          <h3 className="font-display text-3xl text-ink-fg sm:text-4xl">{big.name}</h3>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-fg/85">{big.blurb}</p>
        </div>
      </Link>
      {[med1, med2].map((d) => (
        <Link key={d.slug} href={`/disciplines/${d.slug}`} className="tile-caption tile-bottom relative block h-48">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
          <img src={disciplinePhoto(d.slug)} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="tile-caption__body absolute inset-x-0 bottom-0 p-5">
            <h3 className="font-display text-xl text-ink-fg">{d.name}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
