/**
 * The uppercase promise strip under the /for-coaches hero (canvas 2a/2b):
 * six short claims separated by peach dots, duplicated for the seamless
 * `marquee` loop — 45s on phones, 60s on desktop. Decorative; the claims
 * are all made properly further down the page.
 */
const CLAIMS = [
  "No commission",
  "Cancel any time",
  "Real numbers every month",
  "No accreditation gatekeeping",
  "Riders contact you direct",
  "Testimonials are yours",
];

function Run() {
  return (
    <span className="inline-flex items-center gap-7 pr-7 text-[12px] font-medium uppercase tracking-[0.16em] text-ink-fg wide:gap-10 wide:pr-10 wide:text-[13px]">
      {CLAIMS.map((c) => (
        <span key={c} className="contents">
          <span>{c}</span>
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-peach" />
        </span>
      ))}
    </span>
  );
}

export function PromiseTicker() {
  return (
    <div aria-hidden className="overflow-hidden whitespace-nowrap border-t border-ink-fg/14 bg-ink py-4 wide:py-5">
      <div className="marquee marquee--slow inline-flex">
        <Run />
        <Run />
      </div>
    </div>
  );
}
