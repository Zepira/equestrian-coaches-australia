import type { Viewport } from "next";
import { Reveal } from "@/components/reveal";
import { PromiseTicker } from "@/components/for-coaches/promise-ticker";
import { Plans } from "@/components/for-coaches/plans";
import { FoundingAndEmail, NoCommission, PitchHero, PitchQuestions, WhatWeDo } from "@/components/for-coaches/pitch-sections";
import { COACH_WORDS, comparisonRows, tierCards } from "@/lib/pitch";
import { countWord, getFirstChargeDate, getFoundingFreeMonths, getFoundingJoinBy, getFoundingPrice, getPlans, isFoundingOpen } from "@/lib/settings";
import { getContent } from "@/lib/cms/read";

// Dark hero at the top of this route too; see the same export on "/".
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export const metadata = {
  title: "For coaches",
  description:
    "List your coaching profile and see exactly what it did every month: riders reached, calls and enquiries, quiet months included. No commission, no accreditation gatekeeping.",
};

const WHAT_WE_DO: { title: string; body: string }[] = [
  {
    title: "We build a page for your suburb and your discipline",
    body: '"Dressage coaches in Geelong", and about 400 others like it. Riders search for a discipline and a place far more often than for a name.',
  },
  {
    title: "We write those pages properly",
    body: "150 words each on the top 20, by a person. Google's 2024 rules punished directories that generated thin pages.",
  },
  {
    title: "We only build a page where three or more real coaches exist",
    body: "Keeps the site out of the category Google demotes, which protects your profile too.",
  },
  {
    title: "Your profile carries structured data",
    body: "LocalBusiness and Person markup, so search engines can read who you are and where you teach.",
  },
  {
    title: "Kim answers the recommendation posts in equestrian Facebook groups",
    body: "By name, from her own account. Never an ad.",
  },
  {
    title: "We email riders every month",
    body: "Clinics near them, new coaches in their area.",
  },
  {
    title: "Cards and flyers where riders already stand",
    body: "Saddleries, feed stores, pony club, campdraft canteens.",
  },
  {
    title: "We give you something to share",
    body: 'A "find me on Equine Professionals" graphic and a post you can paste. Free on every plan.',
  },
  {
    title: "We help you set up your own Google Business Profile",
    body: "Free, and yours to keep.",
  },
];

export default async function ForCoachesPage() {
  // Editable in /admin/settings. Before launch day there is no date to
  // print, so the copy says "six months after we launch"; from launch day
  // it names the first charge date.
  const [firstCharge, freeMonths, joinBy, foundingOpen, plans, faq, foundingPrice, notices] = await Promise.all([
    getFirstChargeDate(),
    getFoundingFreeMonths(),
    getFoundingJoinBy(),
    isFoundingOpen(),
    getPlans(),
    getContent("for_coaches.faq"),
    getFoundingPrice(),
    getContent("legal.notices"),
  ]);
  const monthsWord = countWord(freeMonths);
  const w = COACH_WORDS;
  return (
    <div>
      <PitchHero
        crop="for-coaches"
        widths={[768, 1024, 1280, 1536, 1920]}
        eyebrow="For coaches"
        lead="Most directories take your money and show you nothing. We email you every month with how many riders saw your profile, how many clicked to call, and how many got in touch, including the months when the answer is none."
        primary={{ href: "/join/coaches?plan=founding", label: "Join as a founding coach" }}
      />
      <PromiseTicker />
      <FoundingAndEmail
        eyebrow="Founding coaches"
        firstCharge={firstCharge}
        monthsWord={monthsWord}
        spotlightName={plans.spotlight.name}
        foundingPrice={foundingPrice}
        joinBy={joinBy}
        foundingOpen={foundingOpen}
        profileNeeds={w.profileNeeds}
        joinHref="/join/coaches?plan=founding"
      />
      <WhatWeDo items={WHAT_WE_DO} customers={w.customers} listedName={plans.listed.name} clinicName={plans.clinic.name} />
      <Reveal>
        <Plans tiers={tierCards(plans, w)} rows={comparisonRows(w)} joinBase="/join/coaches" planExample={w.planExample} provider={w.provider} billingNote={notices.pricing} />
      </Reveal>
      <NoCommission work={w.work} customer="a rider" />
      <PitchQuestions items={faq.items} provider={w.provider} />
    </div>
  );
}
