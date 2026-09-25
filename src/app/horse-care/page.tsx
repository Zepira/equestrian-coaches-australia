/**
 * The Horse care door (Claude Design, "Two Front Doors", frame A3), built
 * section for section like the coaches door (src/components/coaches-home.tsx)
 * in the steel accent (`data-door="horse-care"`): hero over the farrier
 * photo with the search card and the design's profession tiles, the
 * profession ticker, featured professionals, the profession list/grid with
 * real counts, then how it works and the listing call to action.
 *
 * Listings are mock data (src/lib/mock-professionals.ts) until the schema
 * carries a profession; the counts are counts of that list.
 */
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Hero, type HeroImage } from "@/components/hero";
import { HorseCareSearch } from "@/components/horse-care-search";
import { DisciplineMarquee } from "@/components/discipline-marquee";
import { CoachCard } from "@/components/coach-card";
import { Reveal } from "@/components/reveal";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { RichText } from "@/components/rich-text";
import { horseCareOf, sectionHref } from "@/lib/professions";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { getPlans } from "@/lib/settings";
import { featuredMockProfessionals, professionPhoto } from "@/lib/mock-professionals";
import { getSamples, professionalCount } from "@/lib/samples";
import { createPublicSupabase } from "@/lib/supabase/public";
import { searchProviders } from "@/lib/supabase/queries";
import { termImagePublicUrl } from "@/lib/discipline-content";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export const metadata: Metadata = {
  title: "Horse care",
  description:
    "Farriers, vets, dentists, bodyworkers, saddle fitters and more, found by what your horse needs and where it lives. Free for horse owners.",
};

const FARRIER: HeroImage = { name: "horse-care-farrier", widths: [768, 1024, 1280, 1536], fallback: 1280, width: 1280, height: 853 };

export default async function HorseCareHome() {
  const [all, plans, hero, steps, pitch] = await Promise.all([
    getProfessions(),
    getPlans(),
    getContent("door.horse_care.hero"),
    getContent("door.horse_care.steps"),
    getContent("door.horse_care.pitch"),
  ]);
  const horseCare = horseCareOf(all);
  const [titleFirst, ...titleRest] = pitch.title.split("\n");
  // Real counts, plus samples in the professions that still show them (src/lib/samples.ts).
  const samples = await getSamples();
  const total = professionalCount(samples, horseCare.map((p) => p.slug));
  const professions = horseCare.map((p) => ({ ...p, count: professionalCount(samples, [p.slug]), photo: termImagePublicUrl(p.imagePath) ?? professionPhoto(p.slug, 600) }));
  // Featured: real people first, samples after.
  // The cookie-free client keeps this page static.
  const supabase = createPublicSupabase();
  const ids = horseCare.map((p) => p.id).filter((x): x is string => Boolean(x));
  const real = supabase && ids.length ? (await searchProviders(supabase, ids, {})).slice(0, 4) : [];
  const featured = [...real, ...featuredMockProfessionals(4, samples.show)].slice(0, 4);

  return (
    <>
      <Hero
        className="hero--horse-care"
        image={FARRIER}
        eyebrow={hero.eyebrow}
        words={hero.words}
        cycle={horseCare.map((x) => x.singular)}
        lead={hero.lead}
        leadShort={hero.leadShort}
      >
        <HorseCareSearch professions={horseCare.map(({ slug, name, open }) => ({ slug, name, open }))} />

        {/* The design's profession tiles (frame A3), under the card. Phones
            skip them: eight tiles would push the search below the fold, and
            the same professions are listed in full further down. */}
        <ul className="mt-5 hidden grid-cols-4 gap-2 md:grid wide:gap-2.5">
          {professions.map((x) => (
            <li key={x.slug}>
              <Link
                href={sectionHref(x)}
                className="flex h-full items-center gap-2.5 rounded-[12px] border border-ink-fg/18 bg-ink-deep/35 px-3 py-3 backdrop-blur-[10px] transition-colors duration-200 hover:border-peach hover:bg-ink-deep/55"
              >
                {hasGlyph(x.glyphKey) && <ProfessionGlyph slug={x.glyphKey} size={20} className="text-peach" />}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-ink-fg" title={x.short ? x.name : undefined}>
                    {x.short ?? x.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-tight text-ink-fg/65">{x.count} listed</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[14px] text-ink-fg/75 wide:mt-5 wide:text-[15px]">
          <span>
            {total} professionals · {horseCare.length} professions · Free for horse owners
          </span>
          <Link href="/list-your-business" className="border-b border-current text-peach">
            List your business
          </Link>
        </div>
      </Hero>

      <DisciplineMarquee names={horseCare.map((x) => x.name)} />

      {/* ── Featured professionals ───────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[88px]">
        <div className="flex items-baseline justify-between gap-3 wide:items-end wide:gap-6">
          <div>
            <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:mb-3.5 wide:tracking-[0.2em]">
              Featured professionals
            </p>
            <h2 className="text-[38px] leading-none text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
              Booking visits<br className="wide:hidden" /> <em className="text-accent">now</em>
            </h2>
          </div>
          <Link href="/horse-care/search" className="whitespace-nowrap border-b border-current text-[14px] font-medium text-accent wide:text-[15px]">
            <span className="wide:hidden">See all</span>
            <span className="hidden wide:inline">See everyone listed</span>
          </Link>
        </div>
      </Reveal>
      {/* phones: a snap rail; desktop: a 4-up grid */}
      <div className="hs mt-2.5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-[18px] pb-2 wide:hidden">
        {featured.map((c) => (
          <CoachCard key={c.slug} coach={c} className="w-[250px] shrink-0 snap-start" />
        ))}
      </div>
      <div className="mx-auto hidden max-w-[1184px] grid-cols-4 gap-6 px-12 pt-11 wide:grid">
        {featured.map((c) => (
          <CoachCard key={c.slug} coach={c} />
        ))}
      </div>

      {/* ── By profession ────────────────────────────────────────────── */}
      <Reveal as="section" id="professions" className="mt-12 scroll-mt-20 bg-ink text-ink-fg wide:mt-[88px]">
        <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.4fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
          <div className="wide:sticky wide:top-[100px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-fg/60 wide:tracking-[0.2em]">By profession</p>
            <h2 className="mt-3 text-[40px] leading-none -tracking-[0.02em] wide:mt-4 wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
              Start with what your <em className="text-peach">horse</em> needs.
            </h2>
            <p className="mt-3.5 text-[16px] leading-[1.5] text-ink-fg/78 wide:mt-5 wide:max-w-[36ch] wide:text-[18px]">
              Every professional is listed under the work they actually do, with how far they&apos;ll travel.
            </p>
            <Link
              href="/horse-care/search"
              className="mt-5 hidden border-b border-current text-[15px] font-medium text-peach wide:mt-7 wide:inline-block"
            >
              Browse everyone listed
            </Link>
          </div>

          {/* phones: divided list */}
          <div className="mt-7 flex flex-col border-t border-ink-fg/20 wide:hidden">
            {professions.map((p) => (
              <Link
                key={p.slug}
                href={sectionHref(p)}
                className="flex items-center justify-between gap-3.5 border-b border-ink-fg/20 py-3.5 text-ink-fg"
              >
                <span className="flex min-w-0 items-center gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" className="h-[52px] w-[52px] shrink-0 rounded-t-[26px] rounded-b-[6px] object-cover" loading="lazy" />
                  <span>
                    <span className="flex items-center gap-2 font-display text-[22px]">
                      {hasGlyph(p.glyphKey) && <ProfessionGlyph slug={p.glyphKey} size={18} className="text-peach" />}
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-fg/62">{p.count} listed</span>
                  </span>
                </span>
                <span className="text-[18px] text-ink-fg/60">→</span>
              </Link>
            ))}
          </div>
          <Link href="/horse-care/search" className="mt-5 inline-block border-b border-current text-[15px] font-medium text-peach wide:hidden">
            Browse everyone listed
          </Link>

          {/* desktop: 2-col photo grid */}
          <div className="hidden grid-cols-2 gap-3.5 wide:grid">
            {professions.map((p) => (
              <Link
                key={p.slug}
                href={sectionHref(p)}
                className="group relative block aspect-[1.25] overflow-hidden rounded-[14px] bg-ink-deep text-ink-fg"
              >
                <span data-parallax="drift" data-parallax-speed="0.08" data-parallax-max="40" className="parallax-drift absolute inset-0 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo}
                    alt=""
                    className="block h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                    loading="lazy"
                  />
                </span>
                <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,40,31,0)_40%,rgba(20,40,31,.85)_100%)]" />
                {hasGlyph(p.glyphKey) && (
                  <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink-deep/60 text-peach backdrop-blur-[6px]">
                    <ProfessionGlyph slug={p.glyphKey} size={18} />
                  </span>
                )}
                <span className="absolute inset-x-[18px] bottom-4 flex items-baseline justify-between">
                  <span className="font-display text-[26px]">{p.name}</span>
                  <span className="text-[13px] text-ink-fg/70">{p.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── How it works + listing CTA ───────────────────────────────── */}
      <Reveal
        as="section"
        className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:grid wide:grid-cols-2 wide:gap-16 wide:px-12 wide:py-[88px]"
      >
        <div>
          <h2 className="text-[38px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">
            How it works
          </h2>
          <div className="mt-6 flex flex-col wide:mt-7">
            {steps.items.map((s, i) => (
              <div
                key={s.title}
                className="grid grid-cols-[44px_1fr] gap-3 border-t border-border py-5 wide:grid-cols-[56px_1fr] wide:gap-4 wide:py-[22px]"
              >
                <span className="font-display text-[30px] italic leading-none text-accent wide:text-[34px]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-[17px] font-semibold text-fg wide:text-[18px]">{s.title}</div>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-muted wide:max-w-[44ch] wide:text-[16px]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          id="for-professionals"
          className="relative mt-14 scroll-mt-24 self-start overflow-hidden rounded-[16px] bg-[#e4e9ee] px-[22px] py-7 wide:mt-0 wide:rounded-[20px] wide:p-10"
        >
          <div aria-hidden className="absolute -right-10 -top-10 hidden h-[220px] w-[220px] rounded-full border border-accent/25 wide:block" />
          <div aria-hidden className="absolute -right-2.5 -top-2.5 hidden h-[160px] w-[160px] rounded-full border border-accent/25 wide:block" />
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">{pitch.eyebrow}</p>
          <h2 className="mt-2.5 text-[34px] leading-[1.02] -tracking-[0.02em] text-ink wide:mt-3.5 wide:text-[46px] wide:leading-none wide:-tracking-[0.025em]">
            {titleFirst}
            {titleRest.map((line) => (
              <span key={line}>
                <br className="hidden wide:inline" /> {line}
              </span>
            ))}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.5] text-muted wide:mt-4 wide:max-w-[40ch] wide:text-[17px]">
            <RichText text={fillVariables(pitch.body, { listed_price: plans.listed.monthly })} />
          </p>
          <Link
            href="/list-your-business"
            className="mt-[18px] block rounded-[10px] bg-ink py-[15px] text-center text-[16px] font-semibold text-ink-fg transition-colors duration-[250ms] hover:bg-accent wide:mt-6 wide:inline-block wide:rounded-[var(--radius-pill)] wide:px-[26px]"
          >
            {pitch.button}
          </Link>
        </div>
      </Reveal>
      <div className="h-14 wide:hidden" />
    </>
  );
}
