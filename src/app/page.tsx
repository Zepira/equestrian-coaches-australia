import type { Viewport } from "next";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineMarquee } from "@/components/discipline-marquee";
import { Reveal } from "@/components/reveal";
import { disciplines, getDisciplineBySlug } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches, disciplinePhoto } from "@/lib/mock-coaches";

// Overrides the root layout's cream themeColor (src/app/layout.tsx) — this
// is the one route whose own top edge is the dark hero, not the cream
// header every other page opens with.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

// The eight disciplines the canvas shows in "Start with what you ride", in
// its order. Counts are real (published + mock coaches tagged with each).
const FEATURED_DISCIPLINE_SLUGS = [
  "dressage",
  "western",
  "liberty",
  "show-jumping",
  "eventing",
  "campdrafting",
  "bridleless",
  "working-equitation",
];

const CYCLE = ["dressage", "western", "liberty", "show jumping", "eventing", "campdrafting", "bridleless", "pony club"];

const STEPS = [
  {
    n: "01",
    title: "Tell us what you ride, and where",
    body: "Pick your discipline and your town. Every listing is a real coach, not an agency.",
  },
  {
    n: "02",
    title: "Read their profile",
    body: "Qualifications, disciplines, how far they travel, and words from riders they've taught.",
  },
  {
    n: "03",
    title: "Get in touch, direct",
    body: "No commission, no booking fee. You deal with your coach the way riders always have.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const all = supabase
    ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})]
    : placeholderCoaches.map(toCoachCardData);
  const featured = all.slice(0, 4);

  const countByName = new Map<string, number>();
  for (const c of all) for (const n of c.disciplineNames) countByName.set(n, (countByName.get(n) ?? 0) + 1);
  const featuredDisciplines = FEATURED_DISCIPLINE_SLUGS.map((slug) => {
    const d = getDisciplineBySlug(slug)!;
    return { ...d, count: countByName.get(d.name) ?? 0, photo: disciplinePhoto(slug, 600) };
  });

  return (
    <>
      <Hero
        eyebrow="Riding coaches, Australia-wide"
        words={["Find", "a", "coach", "for"]}
        cycle={CYCLE}
        lead="Search riding coaches across Australia by what you ride and where you are. Free for riders, always."
        leadShort="Search by what you ride and where you are. Free for riders, always."
        stats={[
          { value: String(disciplines.length), label: "disciplines" },
          { value: "Free", label: "for riders" },
          { value: "Direct", label: "contact, no commission" },
        ]}
      >
        <SearchBar />
      </Hero>

      <DisciplineMarquee />

      {/* ── Featured coaches ─────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[88px]">
        <div className="flex items-baseline justify-between gap-3 wide:items-end wide:gap-6">
          <div>
            <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:mb-3.5 wide:tracking-[0.2em]">
              Featured coaches
            </p>
            <h2 className="text-[38px] leading-none text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
              Coaches taking<br className="wide:hidden" /> riders <em className="text-accent">now</em>
            </h2>
          </div>
          <Link
            href="/search"
            className="whitespace-nowrap border-b border-current text-[14px] font-medium text-accent wide:text-[15px]"
          >
            <span className="wide:hidden">See all</span>
            <span className="hidden wide:inline">See all coaches</span>
          </Link>
        </div>
      </Reveal>
      {/* phones: a snap rail; desktop: a 4-up grid */}
      <div className="hs mt-2.5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-[18px] pb-2 wide:hidden">
        {featured.map((coach) => (
          <CoachCard key={coach.slug} coach={coach} className="w-[250px] shrink-0 snap-start" />
        ))}
      </div>
      <div className="mx-auto hidden max-w-[1184px] grid-cols-4 gap-6 px-12 pt-11 wide:grid">
        {featured.map((coach) => (
          <CoachCard key={coach.slug} coach={coach} />
        ))}
      </div>

      {/* ── By discipline ────────────────────────────────────────────── */}
      <Reveal as="section" className="mt-12 bg-ink text-ink-fg wide:mt-[88px]">
        <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.4fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
          <div className="wide:sticky wide:top-[100px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-fg/60 wide:tracking-[0.2em]">
              By discipline
            </p>
            <h2 className="mt-3 text-[40px] leading-none -tracking-[0.02em] wide:mt-4 wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
              Start with what <em className="text-peach">you</em> ride.
            </h2>
            <p className="mt-3.5 text-[16px] leading-[1.5] text-ink-fg/78 wide:mt-5 wide:max-w-[36ch] wide:text-[18px]">
              Coaches are listed by the disciplines they actually teach, not by keyword.
              <span className="hidden wide:inline"> Nineteen so far, from dressage to campdrafting.</span>
            </p>
            <Link
              href="/search"
              className="mt-5 hidden border-b border-current text-[15px] font-medium text-peach wide:mt-7 wide:inline-block"
            >
              All {disciplines.length} disciplines
            </Link>
          </div>

          {/* phones: divided list */}
          <div className="mt-7 flex flex-col border-t border-ink-fg/20 wide:hidden">
            {featuredDisciplines.map((d) => (
              <Link
                key={d.slug}
                href={`/disciplines/${d.slug}`}
                className="flex items-center justify-between gap-3.5 border-b border-ink-fg/20 py-3.5 text-ink-fg"
              >
                <span className="flex min-w-0 items-center gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo}
                    alt=""
                    className="h-[52px] w-[52px] shrink-0 rounded-t-[26px] rounded-b-[6px] object-cover"
                    loading="lazy"
                  />
                  <span>
                    <span className="block font-display text-[22px]">{d.name}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-fg/62">
                      {d.count} coach{d.count === 1 ? "" : "es"}
                    </span>
                  </span>
                </span>
                <span className="text-[18px] text-ink-fg/60">→</span>
              </Link>
            ))}
          </div>
          <Link
            href="/search"
            className="mt-5 inline-block border-b border-current text-[15px] font-medium text-peach wide:hidden"
          >
            All {disciplines.length} disciplines
          </Link>

          {/* desktop: 2-col photo grid */}
          <div className="hidden grid-cols-2 gap-3.5 wide:grid">
            {featuredDisciplines.map((d) => (
              <Link
                key={d.slug}
                href={`/disciplines/${d.slug}`}
                className="group relative block aspect-[1.25] overflow-hidden rounded-[14px] bg-ink-deep text-ink-fg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.photo}
                  alt=""
                  className="block h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,40,31,0)_40%,rgba(20,40,31,.85)_100%)]"
                />
                <span className="absolute inset-x-[18px] bottom-4 flex items-baseline justify-between">
                  <span className="font-display text-[26px]">{d.name}</span>
                  <span className="text-[13px] text-ink-fg/70">{d.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── How it works + coach CTA ─────────────────────────────────── */}
      <Reveal
        as="section"
        className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:grid wide:grid-cols-2 wide:gap-16 wide:px-12 wide:py-[88px]"
      >
        <div>
          <h2 className="text-[38px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">
            How it works
          </h2>
          <div className="mt-6 flex flex-col wide:mt-7">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="grid grid-cols-[44px_1fr] gap-3 border-t border-border py-5 wide:grid-cols-[56px_1fr] wide:gap-4 wide:py-[22px]"
              >
                <span className="font-display text-[30px] italic leading-none text-accent wide:text-[34px]">{s.n}</span>
                <div>
                  <div className="text-[17px] font-semibold text-fg wide:text-[18px]">{s.title}</div>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-muted wide:max-w-[44ch] wide:text-[16px]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="coach-cta relative mt-14 self-start overflow-hidden rounded-[16px] bg-shade px-[22px] py-7 wide:mt-0 wide:rounded-[20px] wide:p-10">
          <div aria-hidden className="absolute -right-10 -top-10 hidden h-[220px] w-[220px] rounded-full border border-accent/25 wide:block" />
          <div aria-hidden className="absolute -right-2.5 -top-2.5 hidden h-[160px] w-[160px] rounded-full border border-accent/25 wide:block" />
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">For coaches</p>
          <h2 className="mt-2.5 text-[34px] leading-[1.02] -tracking-[0.02em] text-ink wide:mt-3.5 wide:text-[46px] wide:leading-none wide:-tracking-[0.025em]">
            Be the coach<br className="hidden wide:inline" /> they find.
          </h2>
          <p className="mt-3 text-[15px] leading-[1.5] text-muted wide:mt-4 wide:max-w-[40ch] wide:text-[17px]">
            A full profile — bio, photo, disciplines, travel radius, testimonials — from{" "}
            <strong className="font-semibold text-fg">$9.99 a month</strong>. Riders contact you direct. No commission, ever.
          </p>
          <Link
            href="/signup?role=coach"
            className="mt-[18px] block rounded-[10px] bg-ink py-[15px] text-center text-[16px] font-semibold text-ink-fg transition-colors duration-[250ms] hover:bg-accent wide:mt-6 wide:inline-block wide:rounded-[var(--radius-pill)] wide:px-[26px]"
          >
            List your profile
          </Link>
        </div>
      </Reveal>
      <div className="h-14 wide:hidden" />
    </>
  );
}
