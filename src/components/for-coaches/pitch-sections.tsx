import Link from "next/link";
import type { ReactNode } from "react";
import { Accordion } from "@/components/accordion";
import { RiseWords } from "@/components/hero";
import { Reveal } from "@/components/reveal";
import { MonthlyEmailExample } from "@/components/for-coaches/monthly-email-example";
import { formatLongDate } from "@/lib/settings";

/**
 * The sections /for-coaches and /for-professionals share. Both pages sell
 * the same plans, the same founding offer and the same monthly email, so the
 * layout lives here once and each page passes in its own nouns and copy.
 */

const srcset = (crop: string, ext: string, widths: number[]) => widths.map((w) => `/hero/${crop}-${w}.${ext} ${w}w`).join(", ");

/* ── Hero: full-bleed photo, seven rising words, two CTAs ─────────────── */
export function PitchHero({
  crop,
  widths,
  className = "",
  eyebrow,
  lead,
  primary,
}: {
  /** the public/hero/<crop>-<width>.<ext> ladder */
  crop: string;
  widths: number[];
  className?: string;
  eyebrow: string;
  lead: string;
  primary: { href: string; label: string };
}) {
  const fallback = widths.includes(1280) ? 1280 : widths[widths.length - 1];
  return (
    <section className={`hero hero--coaches ${className}`}>
      <div className="hero__media" data-parallax>
        <picture>
          <source type="image/avif" srcSet={srcset(crop, "avif", widths)} sizes="100vw" />
          <source type="image/webp" srcSet={srcset(crop, "webp", widths)} sizes="100vw" />
          <img src={`/hero/${crop}-${fallback}.jpg`} alt="" width={1280} height={1280} fetchPriority="high" loading="eager" decoding="async" className="hero__img" />
        </picture>
      </div>
      <div className="hero__scrim" aria-hidden />
      <div className="hero__body">
        <div className="hero__col">
          <p className="hero__eyebrow fade-in" style={{ animationDelay: "0.1s" }}>
            {eyebrow}
          </p>
          <h1 className="hero__h1">
            <RiseWords words={["You'll", "know", "exactly", "what", "your", "listing", "did."]} emphasis={[2]} />
          </h1>
          <p className="hero__lead fade-in" style={{ animationDelay: "0.7s" }}>
            {lead}
          </p>
          <div className="fade-in flex flex-col gap-2 wide:flex-row wide:gap-2.5" style={{ animationDelay: "0.85s" }}>
            <Link href={primary.href} className="block rounded-[10px] bg-accent px-[26px] py-[15px] text-center text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:py-4">
              {primary.label}
            </Link>
            <Link href="#included" className="block rounded-[10px] border border-ink-fg/40 px-[26px] py-3.5 text-center text-[16px] font-medium text-ink-fg transition-colors duration-[250ms] hover:bg-ink-fg/10 wide:py-[15px]">
              See what&rsquo;s included
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Founding offer beside the monthly email ──────────────────────────── */
export function FoundingAndEmail({
  eyebrow,
  firstCharge,
  monthsWord,
  spotlightName,
  foundingPrice,
  joinBy,
  foundingOpen,
  profileNeeds,
  joinHref,
  image = "founding",
  searches,
  customers,
}: {
  eyebrow: string;
  firstCharge: Date | null;
  monthsWord: string;
  spotlightName: string;
  foundingPrice: string;
  joinBy: Date | null;
  foundingOpen: boolean;
  profileNeeds: string;
  joinHref: string;
  /** the public/hero crop behind the founding band (built at 640, 1024, 1400) */
  image?: string;
  searches?: [string, string];
  customers?: string;
}) {
  return (
    <div className="mx-auto wide:max-w-[1184px] wide:px-12 wide:pt-[88px]">
      <Reveal className="wide:grid wide:grid-cols-2 wide:items-center wide:gap-14">
        <section className="founding relative overflow-hidden bg-ink-deep px-[18px] py-16 text-ink-fg wide:flex wide:min-h-[560px] wide:flex-col wide:justify-end wide:rounded-[20px] wide:px-11 wide:py-[52px]">
          <picture>
              <source type="image/avif" srcSet={srcset(image, "avif", [640, 1024, 1400])} sizes="(min-width: 1100px) 560px, 100vw" />
              <source type="image/webp" srcSet={srcset(image, "webp", [640, 1024, 1400])} sizes="(min-width: 1100px) 560px, 100vw" />
              <img src={`/hero/${image}-1024.jpg`} alt="" loading="lazy" decoding="async" data-parallax="drift" data-parallax-speed="0.1" className="founding__img parallax-drift absolute inset-0 h-full w-full object-cover opacity-35 wide:opacity-40" />
          </picture>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,24,18,.55),rgba(13,24,18,.85))] wide:bg-[linear-gradient(180deg,rgba(13,24,18,.2),rgba(13,24,18,.9)_70%)]" />
          <div className="relative">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-peach wide:tracking-[0.2em]">{eyebrow}</p>
            <h2 className="mt-3 text-[38px] leading-none -tracking-[0.02em] wide:mt-3.5 wide:text-[46px]">
              {firstCharge ? (
                <>
                  Free until <em className="text-peach">{formatLongDate(firstCharge)}</em>
                </>
              ) : (
                <>
                  Free for {monthsWord} months <em className="text-peach">after launch</em>
                </>
              )}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-ink-fg/85 wide:mt-[18px]">
              {firstCharge
                ? `We take your card when you sign up and don't charge it until ${formatLongDate(firstCharge)}, with a reminder before then.`
                : `We take your card when you sign up, and we don't charge it until ${monthsWord} months after the site launches. On launch day you'll get an email with the exact date, and a reminder before the first payment.`}{" "}
              Until then you&rsquo;re on {spotlightName}, our middle plan. After that it&rsquo;s {foundingPrice} a month, and that price stays yours for as long as you keep your listing, even when it goes up for new members. All we ask is a finished profile: a photo, a bio in your own words, {profileNeeds} and where you work.
              {joinBy && foundingOpen && ` Founding spots close on ${formatLongDate(joinBy)}.`}
            </p>
            <Link href={joinHref} className="mt-[22px] inline-block rounded-[10px] bg-accent px-[22px] py-3.5 text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:mt-6 wide:px-6">
              Claim a founding spot
            </Link>
          </div>
        </section>

        <section className="px-[18px] pt-14 wide:px-0 wide:pt-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">Every month, good or quiet</p>
          <h2 className="mt-2.5 text-[38px] leading-none -tracking-[0.02em] text-ink wide:mt-3 wide:text-[46px]">The monthly email, shown</h2>
          <div className="mt-6">
            <MonthlyEmailExample searches={searches} customers={customers} />
          </div>
        </section>
      </Reveal>
    </div>
  );
}

/* ── What we actually do ──────────────────────────────────────────────── */
export function WhatWeDo({
  items,
  customers,
  listedName,
  clinicName,
}: {
  items: { title: string; body: string }[];
  customers: string;
  listedName: string;
  clinicName: string;
}) {
  const allPlans = (
    <>
      All of that happens whether you&rsquo;re on {listedName} or {clinicName}.
    </>
  );
  return (
    <Reveal as="section" className="mt-14 bg-ink text-ink-fg wide:mt-[88px]">
      <div id="included" className="mx-auto max-w-[1184px] scroll-mt-20 px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.5fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
        <div className="wide:sticky wide:top-[100px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-fg/60 wide:tracking-[0.2em]">What&rsquo;s included</p>
          <h2 className="mt-3 text-[38px] leading-none -tracking-[0.02em] wide:mt-4 wide:text-[60px] wide:leading-[0.98] wide:-tracking-[0.025em]">
            What we actually do to bring <em className="text-peach">{customers}</em> to you
          </h2>
          <p className="mt-[22px] hidden text-[16px] font-medium text-peach wide:block">{allPlans}</p>
        </div>
        <div className="mt-7 flex flex-col border-t border-ink-fg/20 wide:mt-0">
          {items.map((row, i) => (
            <div key={row.title} className="grid grid-cols-[36px_1fr] gap-2.5 border-b border-ink-fg/20 py-[18px] wide:grid-cols-[48px_1fr] wide:gap-4 wide:py-[22px]">
              <span className="pt-0.5 font-display text-[22px] italic leading-none text-peach wide:text-[26px]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-display text-[21px] leading-[1.15] wide:text-[25px]">{row.title}</div>
                <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-fg/75 wide:mt-2 wide:max-w-[60ch] wide:text-[15.5px]">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-[22px] text-[15px] font-medium text-peach wide:hidden">{allPlans}</p>
      </div>
    </Reveal>
  );
}

/* ── No commission ────────────────────────────────────────────────────── */
export function NoCommission({ work, customer }: { work: string; customer: string }) {
  return (
    <Reveal as="section" className="mx-[18px] mt-14 rounded-[16px] bg-ink-deep px-6 py-9 text-center text-ink-fg wide:mx-0 wide:mt-[88px] wide:rounded-none wide:px-12 wide:py-24">
      <p className="mx-auto font-display text-[34px] leading-[1.02] -tracking-[0.02em] wide:max-w-[18ch] wide:text-[64px] wide:leading-none wide:-tracking-[0.025em]">
        We never take a <em className="text-peach">percentage</em> of a {work}.
      </p>
      <p className="mx-auto mt-3.5 text-[15px] leading-[1.5] text-ink-fg/80 wide:mt-[22px] wide:max-w-[48ch] wide:text-[18px]">
        A flat monthly fee and nothing else, forever. What {customer} pays you is between you and them.
      </p>
    </Reveal>
  );
}

/* ── Questions + "tell us what to fix" ────────────────────────────────── */
export function PitchQuestions({ items, before }: { items: { title: string; body: string }[]; before?: ReactNode }) {
  const feedback = `This site is new and we'd rather hear what's not working from you than guess. If something's confusing, missing or just annoying, email us and a person who runs the site reads it, not a ticket queue. Founding members get a reply within two business days.`;
  return (
    <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.6fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
      <div className="wide:sticky wide:top-[100px]">
        <h2 className="text-[38px] leading-none -tracking-[0.02em] text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">Questions</h2>
        <div className="feedback mt-8 hidden rounded-[16px] bg-shade px-6 py-[26px] wide:block">
          <p className="font-display text-[26px] leading-[1.1] text-ink">Tell us what to fix</p>
          <p className="mt-2.5 text-[15px] leading-[1.55] text-muted">{feedback}</p>
        </div>
      </div>
      <div>
        {before}
        <div className="mt-5 wide:mt-0">
          <Accordion items={items.map((x) => ({ q: x.title, a: x.body }))} />
        </div>
        <div className="feedback mt-7 rounded-[16px] bg-shade px-5 py-6 wide:hidden">
          <p className="font-display text-[24px] leading-[1.1] text-ink">Tell us what to fix</p>
          <p className="mt-2.5 text-[14.5px] leading-[1.55] text-muted">{feedback}</p>
        </div>
      </div>
    </Reveal>
  );
}
