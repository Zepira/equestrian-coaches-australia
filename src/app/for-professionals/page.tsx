import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { RichText } from "@/components/rich-text";
import { Reveal } from "@/components/reveal";
import { Accordion } from "@/components/accordion";
import { PromiseTicker } from "@/components/for-coaches/promise-ticker";
import { Plans } from "@/components/for-coaches/plans";
import { FoundingAndEmail, NoCommission, PitchHero, PitchQuestions, WhatWeDo } from "@/components/for-coaches/pitch-sections";
import { fillVariables, getContent, getProfessions } from "@/lib/cms/read";
import { horseCareOf } from "@/lib/professions";
import { PROFESSIONAL_WORDS, comparisonRows, tierCards } from "@/lib/pitch";
import { countWord, getFirstChargeDate, getFoundingFreeMonths, getFoundingJoinBy, getFoundingPrice, getPlans, isFoundingOpen } from "@/lib/settings";

/**
 * /for-professionals (The Site as a CMS §06.1): the horse care door's
 * equivalent of /for-coaches, built from the same sections
 * (components/for-coaches/pitch-sections) because it sells the same plans.
 * What's different: the steel door, the farrier photo, the nouns, and the
 * "What do you do?" picker, since sign-up needs a profession
 * (/join/[profession]). Arriving with ?p=farriers sets it, so every button
 * on the page then goes straight to that profession's sign-up.
 *
 * A profession's own pitch (profession_details.pitch) shows when it has one;
 * until then the horse care pitch block does. Those pitches get written after
 * the first real conversations with each profession, not invented here.
 */

// Dark hero, the same as /for-coaches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export async function generateMetadata(): Promise<Metadata> {
  const plans = await getPlans();
  return {
    title: "For horse care professionals",
    description: `Farriers, vets, dentists, bodyworkers and the rest list here from ${plans.listed.monthly} a month. Owners contact you directly, and we take no commission.`,
  };
}

const WHAT_WE_DO: { title: string; body: string }[] = [
  {
    title: "We build a page for your profession and your area",
    body: '"Farriers in Geelong", "equine dentists in Bendigo". Owners search for the job and the place far more often than for a name.',
  },
  {
    title: "Those pages only go up where there's something real on them",
    body: "An area gets its own page once enough people are listed there. Until then you're on the wider pages, so nobody lands on an empty list, and Google doesn't count us as a thin directory.",
  },
  {
    title: "Your profile carries structured data",
    body: "Your business name, what you do and where you work are marked up so search engines can read them.",
  },
  {
    title: "We email horse owners when someone new starts near them",
    body: "Owners choose an area and the kind of help they're after, and hear from us when you join.",
  },
  {
    title: "Cards and flyers where horse owners already stand",
    body: "Saddleries, feed stores, agistment centres and pony club.",
  },
  {
    title: "We give you something to share",
    body: "A share image, a poster, a badge for your website and an email signature. Free on every plan.",
  },
  {
    title: "We help you set up your own Google Business Profile",
    body: "Free, and yours to keep.",
  },
];

const CLAIMS = ["No commission", "Cancel any time", "Real numbers every month", "No booking fees", "Owners contact you direct", "Testimonials are yours"];

export default async function ForProfessionals({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const [all, plans, pitch, lyb, faq, firstCharge, freeMonths, joinBy, foundingOpen, foundingPrice, notices] = await Promise.all([
    getProfessions(),
    getPlans(),
    getContent("door.horse_care.pitch"),
    getContent("list_your_business"),
    getContent("for_professionals.faq"),
    getFirstChargeDate(),
    getFoundingFreeMonths(),
    getFoundingJoinBy(),
    isFoundingOpen(),
    getFoundingPrice(),
    getContent("legal.notices"),
  ]);
  const professions = horseCareOf(all).filter((x) => x.launchState !== "draft");
  const selected = professions.find((x) => x.slug === p);
  const vars = { listed_price: plans.listed.monthly, top_price: plans.clinic.monthly };
  const [titleFirst, ...titleRest] = pitch.title.split("\n");
  const w = PROFESSIONAL_WORDS;
  // With a profession picked, every button signs up as it; without one,
  // they all go to the picker first.
  const joinBase = selected ? `/join/${selected.slug}` : "#professions";
  const foundingHref = selected ? `${joinBase}?plan=founding` : joinBase;

  return (
    <div data-door="horse-care">
      <PitchHero
        crop="horse-care-farrier"
        widths={[768, 1024, 1280, 1536]}
        className="hero--horse-care"
        eyebrow={selected ? `For ${selected.plural}` : "For horse care professionals"}
        lead="Most directories take your money and show you nothing. We email you every month with how many horse owners saw your profile, how many tapped to call, and how many got in touch, including the months when the answer is none."
        primary={{ href: foundingHref, label: selected ? `Join as a founding ${selected.singular}` : "Join as a founding member" }}
      />
      <PromiseTicker claims={CLAIMS} />

      {/* ── What do you do? ─────────────────────────────────────────────── */}
      <section id="professions" className="mx-auto max-w-[1184px] scroll-mt-20 px-[18px] pt-14 wide:px-12 wide:pt-[88px]">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">{pitch.eyebrow}</p>
        <h2 className="mt-3 max-w-[16ch] text-[38px] leading-none -tracking-[0.02em] text-ink wide:mt-4 wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">
          {titleFirst} {titleRest.length > 0 && <em className="text-accent">{titleRest.join(" ")}</em>}
        </h2>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.5] text-muted wide:mt-6 wide:text-[19px]">
          <RichText text={fillVariables(selected?.pitch || pitch.body, vars)} />
        </p>

        <h3 className="mt-10 font-display text-[26px] leading-none text-ink wide:mt-12 wide:text-[32px]">What do you do?</h3>
        <ul className="mt-6 grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 wide:grid-cols-4">
          {professions.map((x) => (
            <li key={x.slug}>
              <Link
                href={`/join/${x.slug}?plan=founding`}
                aria-current={selected?.slug === x.slug ? "true" : undefined}
                className={`flex h-full flex-col rounded-[16px] border bg-surface p-5 transition-colors duration-200 hover:border-accent ${selected?.slug === x.slug ? "border-accent" : "border-border"}`}
              >
                {hasGlyph(x.glyphKey) && <ProfessionGlyph slug={x.glyphKey} size={26} className="text-accent" />}
                <span className="mt-3 font-display text-[24px] leading-none text-ink">{x.name}</span>
                <span className="mt-2 flex-1 text-[14px] leading-[1.45] text-muted">{x.blurb}</span>
                <span className="mt-4 text-[14px] font-medium text-accent">Sign up as {/^[aeiou]/i.test(x.singular) ? "an" : "a"} {x.singular} →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[60ch] text-[15px] leading-[1.55] text-subtle">
          {fillVariables(lyb.plansLine, vars)} Teach riding?{" "}
          <Link href="/for-coaches" className="border-b border-current text-accent">
            Coaches have their own page
          </Link>
          .
        </p>
      </section>

      <FoundingAndEmail
        eyebrow={selected ? `Founding ${selected.plural}` : "Founding members"}
        firstCharge={firstCharge}
        monthsWord={countWord(freeMonths)}
        spotlightName={plans.spotlight.name}
        foundingPrice={foundingPrice}
        joinBy={joinBy}
        foundingOpen={foundingOpen}
        profileNeeds={w.profileNeeds}
        joinHref={foundingHref}
        image="founding-horse-care"
        searches={["farrier Geelong", "barefoot trim Bellarine"]}
        customers={w.customers}
      />
      <WhatWeDo items={WHAT_WE_DO} customers={w.customers} listedName={plans.listed.name} clinicName={plans.clinic.name} />
      <Reveal>
        <Plans tiers={tierCards(plans, w)} rows={comparisonRows(w)} joinBase={joinBase} planExample={w.planExample} provider={w.provider} billingNote={notices.pricing} />
      </Reveal>
      <NoCommission work={w.work} customer="an owner" />
      <PitchQuestions
        items={faq.items}
        provider={w.provider}
        before={
          selected && selected.faq.length > 0 ? (
            <div className="mb-10">
              <h3 className="font-display text-[26px] leading-none text-ink wide:text-[32px]">Questions {selected.plural} ask</h3>
              <div className="mt-5">
                <Accordion items={selected.faq.map((x) => ({ q: x.title, a: x.body }))} />
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
