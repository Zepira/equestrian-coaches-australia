/**
 * The discipline ticker under the hero (canvas 1a): a single line of
 * Instrument Serif names separated by peach dots, duplicated once so the
 * `marquee` keyframe's translateX(-50%) loops seamlessly. 40s on phones,
 * 55s on desktop. Decorative — `aria-hidden`, the disciplines are listed
 * properly further down the page.
 */
const NAMES = [
  "Dressage",
  "Western",
  "Liberty",
  "Show Jumping",
  "Eventing",
  "Campdrafting",
  "Bridleless",
  "Working Equitation",
  "Pony Club",
  "Trail Riding",
  "Para-Equestrian",
  "Natural Horsemanship",
];

function Run() {
  return (
    <span className="font-display text-[20px] text-ink-fg wide:text-[26px]">
      {NAMES.map((n) => (
        <span key={n} className="pr-[26px] wide:pr-[34px]">
          {n} <span className="text-peach">·</span>
        </span>
      ))}
    </span>
  );
}

export function DisciplineMarquee({ names = NAMES }: { names?: string[] }) {
  void names;
  return (
    <div
      aria-hidden
      className="overflow-hidden whitespace-nowrap border-t border-ink-fg/14 bg-ink py-[13px] wide:py-4"
    >
      <div className="marquee inline-flex">
        <Run />
        <Run />
      </div>
    </div>
  );
}
