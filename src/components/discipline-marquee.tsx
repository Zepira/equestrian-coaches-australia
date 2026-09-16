import { disciplines } from "@/lib/disciplines";

/**
 * The discipline ticker under the hero (canvas 1a): a single line of
 * Instrument Serif names separated by peach dots, duplicated once so the
 * `marquee` keyframe's translateX(-50%) loops seamlessly. 40s on phones,
 * 55s on desktop. Decorative — `aria-hidden`, the disciplines are listed
 * properly further down the page.
 *
 * Every discipline, in the same alphabetical order as the list further
 * down the page. The dot is a separator with equal margin either side, so
 * it sits centred in the gap rather than hanging off the word before it —
 * the trailing dot after the last name is what carries the seam between
 * the two copies.
 */
const NAMES = disciplines.map((d) => d.name);

function Run({ names }: { names: string[] }) {
  return (
    <span className="font-display text-[20px] text-ink-fg wide:text-[26px]">
      {names.map((n) => (
        <span key={n}>
          {n}
          <span className="mx-[15px] text-peach wide:mx-[19px]">·</span>
        </span>
      ))}
    </span>
  );
}

export function DisciplineMarquee({ names = NAMES }: { names?: string[] }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden whitespace-nowrap border-t border-ink-fg/14 bg-ink py-[13px] wide:py-4"
    >
      <div className="marquee inline-flex">
        <Run names={names} />
        <Run names={names} />
      </div>
    </div>
  );
}
