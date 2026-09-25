/**
 * The parent home page: the front door for every profession, not the
 * coaches page (that lives at /coaches, `src/components/coaches-home.tsx`).
 *
 * The switchboard shape from content/handbook/site-structure.html §07:
 * brand hero with the coach search (the only live section, so the only
 * search on the hero), then one block per section, then how the site
 * works, then a split call to action for professionals. The horse-care
 * block links each profession through `sectionHref`, so it points at the
 * real section the day one opens.
 */
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { SearchBar } from "@/components/search-bar";
import { Reveal } from "@/components/reveal";
import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getAttributes, getDisciplineContent, getSkills, searchCoaches } from "@/lib/supabase/queries";
import { disciplineImage } from "@/lib/discipline-content";
import { toTermOption } from "@/lib/term-options";
import { searchMockCoaches } from "@/lib/mock-coaches";
import { placeholderCoaches } from "@/lib/placeholder-coaches";
import { horseCareOf, sectionHref } from "@/lib/professions";
import { getContent, getFeaturedDisciplines, getProfessions } from "@/lib/cms/read";
import { getPlans } from "@/lib/settings";
import { getSamples, professionalCount } from "@/lib/samples";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { disciplinePath } from "@/lib/page-paths";

// Overrides the root layout's cream themeColor (src/app/layout.tsx): the
// hero, not the cream header, is this route's own top edge.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export const metadata: Metadata = {
  description:
    "Find riding coaches, farriers, vets, dentists and the rest of your horse's team across Australia, by what you need and where you are. Free for riders and owners.",
};

const eyebrow = "text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]";

export default async function Home() {
  const supabase = await createClient();
  const [skills, attributes, disciplines, professions, featured, plans, hero, principles] = await Promise.all([
    getSkills(supabase),
    getAttributes(supabase),
    getDisciplineContent(supabase),
    getProfessions(),
    getFeaturedDisciplines(),
    getPlans(),
    getContent("home.hero"),
    getContent("home.principles"),
  ]);
  const horseCare = horseCareOf(professions);
  // Mock data merge — see src/lib/mock-coaches.ts to remove. Same list the
  // coaches page counts, so the numbers agree between the two.
  const samples = await getSamples();
  const coachCount = supabase
    ? (await searchCoaches(supabase, {})).length + (samples.show("coaches") ? searchMockCoaches({}).length : 0)
    : placeholderCoaches.length;

  const bySlug = new Map(disciplines.map((d) => [d.slug, d]));
  const chips = featured.map((f) => bySlug.get(f.slug)).filter((d) => d !== undefined);
  const lead = bySlug.get("dressage") ?? disciplines[0];
  const photo = lead ? disciplineImage(lead, 1000) : null;
  const proCount = professionalCount(samples, horseCare.map((p) => p.slug));

  return (
    <>
      <Hero
        eyebrow={hero.eyebrow}
        words={hero.words}
        emphasis={hero.emphasis}
        lead={hero.lead}
        leadShort={hero.leadShort}
        stats={[
          { value: String(coachCount), label: coachCount === 1 ? "coach" : "coaches" },
          { value: String(proCount), label: "horse care professionals" },
          { value: "Free", label: "for riders and owners" },
        ]}
      >
        <SearchBar
          skills={skills.map(toTermOption)}
          attributes={attributes.map(toTermOption)}
          disciplineOptions={disciplines.map(toTermOption)}
        />
      </Hero>

      {/* ── The sections ─────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-[88px]">
        <p className={`${eyebrow} mb-2.5 wide:mb-3.5`}>What&apos;s on the site</p>
        <h2 className="text-[38px] leading-none text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
          Coaches and horse <em className="text-accent">care</em>
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 wide:mt-12 wide:grid-cols-[1.15fr_1fr] wide:gap-6">
          {/* Coaches: the live section */}
          <article className="overflow-hidden rounded-[16px] bg-ink-deep text-ink-fg wide:rounded-[20px]">
            {photo && (
              <div className="relative aspect-[16/9] overflow-hidden">
                <span data-parallax="drift" data-parallax-speed="0.08" data-parallax-max="40" className="parallax-drift absolute inset-0 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.alt} className="block h-full w-full object-cover" loading="lazy" />
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,40,31,0)_45%,rgba(20,40,31,.9)_100%)]"
                />
              </div>
            )}
            <div className="p-6 wide:p-9">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-peach wide:tracking-[0.2em]">Open now</p>
              <h3 className="mt-2 text-[34px] leading-none wide:text-[46px]">Riding coaches</h3>
              <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.5] text-ink-fg/80 wide:text-[17px]">
                {coachCount} coaches across {disciplines.length} disciplines. Search by what you ride and the town
                you&apos;re in, read their profiles, and contact the ones you like yourself.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {chips.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={disciplinePath(d.slug)}
                      className="block rounded-[var(--radius-pill)] border border-ink-fg/25 px-3.5 py-1.5 text-[13px] transition-colors hover:border-peach hover:text-peach"
                    >
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <LinkButton href="/coaches">Go to coaches</LinkButton>
                <Link href="/search" className="border-b border-current text-[15px] font-medium text-peach">
                  Search every coach
                </Link>
              </div>
            </div>
          </article>

          {/* Horse care: every profession, in the Horse care door's steel */}
          <article data-door="horse-care" className="rounded-[16px] border border-border bg-surface p-6 wide:rounded-[20px] wide:p-9">
            <p className={eyebrow}>Horse care</p>
            <h3 className="mt-2 text-[34px] leading-none text-ink wide:text-[46px]">The rest of the team</h3>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.5] text-muted wide:text-[16px]">
              {proCount} professionals across {horseCare.length} professions. Search by what your horse needs and where it lives.
            </p>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {horseCare.map((p) => (
                <li key={p.slug}>
                  <Link href={sectionHref(p)} className="group flex items-center justify-between gap-4 py-3">
                    <span className="flex items-center gap-3 font-display text-[21px] leading-tight text-ink group-hover:text-accent wide:text-[23px]">
                      {hasGlyph(p.glyphKey) && <ProfessionGlyph slug={p.glyphKey} size={20} className="text-accent" />}
                      {p.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-subtle">{professionalCount(samples, [p.slug])} listed</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <LinkButton href="/horse-care">Go to horse care</LinkButton>
              <Link href="/horse-care/search" className="border-b border-current text-[15px] font-medium text-accent">
                Search everyone
              </Link>
            </div>
          </article>
        </div>
      </Reveal>

      {/* ── How the site works ───────────────────────────────────────── */}
      <Reveal as="section" className="mt-14 bg-ink-deep text-ink-fg wide:mt-[88px]">
        <div className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.4fr] wide:gap-16 wide:px-12 wide:py-[88px]">
          <h2 className="text-[38px] leading-none -tracking-[0.02em] wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">
            How the site <em className="text-peach">works</em>
          </h2>
          <ol className="mt-7 flex flex-col wide:mt-0">
            {principles.items.map((p, i) => (
              <li
                key={p.title}
                className="grid grid-cols-[44px_1fr] gap-3 border-t border-ink-fg/15 py-5 wide:grid-cols-[56px_1fr] wide:gap-4 wide:py-[22px]"
              >
                <span className="font-display text-[30px] italic leading-none text-peach wide:text-[34px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[17px] font-semibold wide:text-[18px]">{p.title}</div>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-ink-fg/75 wide:max-w-[48ch] wide:text-[16px]">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* ── For professionals ────────────────────────────────────────── */}
      <Reveal
        as="section"
        className="mx-auto grid max-w-[1184px] grid-cols-1 gap-4 px-[18px] py-14 wide:grid-cols-2 wide:gap-6 wide:px-12 wide:py-[88px]"
      >
        <div className="rounded-[16px] bg-shade p-6 wide:rounded-[20px] wide:p-10">
          <p className={eyebrow}>For coaches</p>
          <h2 className="mt-2.5 text-[34px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[44px] wide:leading-none">
            Teach riding?
          </h2>
          <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.5] text-muted wide:text-[17px]">
            List your coaching profile from <strong className="font-semibold text-fg">{plans.listed.monthly} a month</strong>.
            Riders find you by discipline and town, and contact you directly.
          </p>
          <div className="mt-6">
            <LinkButton href="/for-coaches">List your profile</LinkButton>
          </div>
        </div>
        <div data-door="horse-care" className="rounded-[16px] bg-[#e4e9ee] p-6 wide:rounded-[20px] wide:p-10">
          <p className={eyebrow}>For horse care professionals</p>
          <h2 className="mt-2.5 text-[34px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[44px] wide:leading-none">
            Farrier, vet or saddle fitter?
          </h2>
          <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.5] text-muted wide:text-[17px]">
            List your business from <strong className="font-semibold text-fg">{plans.listed.monthly} a month</strong>. Owners find you
            by what you do and the area you cover, and contact you directly.
          </p>
          <div className="mt-6">
            <LinkButton href="/list-your-business">List your business</LinkButton>
          </div>
        </div>
      </Reveal>
    </>
  );
}
