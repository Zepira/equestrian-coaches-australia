import type { Viewport } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Accordion } from "@/components/accordion";
import { MonthlyEmailExample } from "@/components/for-coaches/monthly-email-example";
import { PromiseTicker } from "@/components/for-coaches/promise-ticker";
import { Plans, type Tier } from "@/components/for-coaches/plans";
import { RiseWords } from "@/components/hero";

// Dark hero at the top of this route too — see the same export on "/".
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export const metadata = {
  title: "For coaches",
  description:
    "List your coaching profile and see exactly what it did — riders reached, calls, enquiries — every month, including the quiet ones. No commission, no accreditation gatekeeping.",
};

const WHAT_WE_DO: { title: string; body: string }[] = [
  {
    title: "We build a page for your suburb and your discipline",
    body: '"Dressage coaches in Geelong" — and about 400 others. Riders search discipline + place far more than they search names.',
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
    body: "By name — not an anonymous account, not an ad.",
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
    body: 'A "find me on ECA" graphic and a post you can paste. Free on every plan.',
  },
  {
    title: "We help you set up your own Google Business Profile",
    body: "Free, and yours to keep.",
  },
];

const TIERS: Tier[] = [
  {
    key: "listed",
    name: "Listed",
    monthly: "$9.99",
    yearly: "$99",
    tagline: "For most coaches",
    summary:
      "Everything a coach needs to be found and reached: an indexed profile, area and discipline listings, enquiries, testimonials and the monthly numbers email.",
    cta: "Join as a founding coach",
  },
  {
    key: "spotlight",
    name: "Spotlight",
    monthly: "$24.95",
    yearly: "$249",
    tagline: "For coaches building a book",
    featured: true,
    summary:
      "Everything in Listed, plus a featured slot on your area pages, instant enquiry alerts, search-query insights, an intro video and unlimited events.",
    cta: "Choose Spotlight",
  },
  {
    key: "clinic",
    name: "Clinic",
    monthly: "$49.95",
    yearly: "$499",
    tagline: "For coaches who are already full",
    summary:
      "Everything in Spotlight, plus your events pushed to riders statewide, waitlist capture, benchmarks and up to three locations.",
    cta: "Choose Clinic",
  },
];

const EVERY_TIER = [
  "Profile page indexed by Google",
  "Listed on area and discipline pages",
  "Travel radius you set yourself",
  "Remote / online lessons",
  "Enquiry form",
  "Click-to-reveal contact",
  "Unlimited testimonials",
  "Taking-new-students status (yes / waitlist / no)",
  "One live event",
  "Profile views, contact reveals and enquiries",
  "The monthly numbers email",
];

const SPOTLIGHT_ADDS = [
  "Featured slot on your area pages (labelled, capped at three, rotating)",
  "Instant enquiry alerts by email and SMS",
  "Enquiry inbox with outcomes",
  "Google search impressions and the queries you appeared for",
  "Full funnel and 12-month trend",
  "Intro video",
  "10 photos",
  "All contact methods, plus a link to your own website",
  "Testimonial request link and reminders",
  "Pin a testimonial",
  "Unlimited events",
];

const CLINIC_ADDS = [
  "Your events pushed to riders by email statewide",
  "Each event gets its own indexed page Google can surface",
  "Waitlist capture for when you can't take anyone",
  "Benchmarks against similar coaches",
  "Up to three locations",
];

const COMPARISON_ROWS: { label: string; listed: boolean; spotlight: boolean; clinic: boolean }[] = [
  ...EVERY_TIER.map((label) => ({ label, listed: true, spotlight: true, clinic: true })),
  ...SPOTLIGHT_ADDS.map((label) => ({ label, listed: false, spotlight: true, clinic: true })),
  ...CLINIC_ADDS.map((label) => ({ label, listed: false, spotlight: false, clinic: true })),
];

const FAQ_ITEMS = [
  {
    q: "What if I don't get any enquiries?",
    a: "You'll know, because we'll tell you. The monthly email shows the real numbers whether they're good or not, and when it's quiet it says so and tells you what's most likely to change it. Cancel any time — no contract, no notice.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes, one click in your dashboard. Your listing stays live until the end of the period you've paid for, and nothing you've added is deleted.",
  },
  {
    q: "Do you take a cut of my lesson fees?",
    a: "No. Never. A flat monthly fee and nothing else.",
  },
  {
    q: "What happens to my testimonials if I leave?",
    a: "They're yours. They stay on your profile if you come back, and we'll send you a copy if you ask.",
  },
  {
    q: "Will you sell my details?",
    a: "No. Your contact details are shown to riders who click to see them, and that's it. We don't sell or rent our lists.",
  },
  {
    q: "Do I need to be accredited?",
    a: "No. We list Western, liberty, natural horsemanship and trail coaches alongside accredited ones, because riders look for all of them. Any qualifications you upload are displayed as supplied by you — we don't verify or endorse anyone.",
  },
  {
    q: "What if there aren't many coaches in my area?",
    a: "Then you're the answer to every search in it. We don't build an area page until three coaches exist there, so a thin area may take a while to get its own page — but your profile is live and findable from day one. We also switch the featured slot off in small areas, because being one of three isn't worth paying for.",
  },
  {
    q: "How long before I see anything?",
    a: "Six to twelve months for Google traffic to build properly. That's normal for a new site and we'd rather say it than pretend otherwise. What moves first is your search impressions — how often you're appearing — and you'll see those from the start.",
  },
];

const WIDTHS = [768, 1024, 1280, 1536, 1920];
const srcset = (crop: string, ext: string, widths: number[]) => widths.map((w) => `/hero/${crop}-${w}.${ext} ${w}w`).join(", ");

export default function ForCoachesPage() {
  return (
    <div>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="hero hero--coaches">
        <div className="hero__media" data-parallax>
          <picture>
            <source type="image/avif" srcSet={srcset("for-coaches", "avif", WIDTHS)} sizes="100vw" />
            <source type="image/webp" srcSet={srcset("for-coaches", "webp", WIDTHS)} sizes="100vw" />
            <img src="/hero/for-coaches-1280.jpg" alt="" width={1280} height={1280} fetchPriority="high" loading="eager" decoding="async" className="hero__img" />
          </picture>
        </div>
        <div className="hero__scrim" aria-hidden />
        <div className="hero__body">
          <div className="hero__col">
            <p className="hero__eyebrow fade-in" style={{ animationDelay: "0.1s" }}>
              For coaches
            </p>
            <h1 className="hero__h1">
              <RiseWords words={["You'll", "know", "exactly", "what", "your", "listing", "did."]} emphasis={[2]} />
            </h1>
            <p className="hero__lead fade-in" style={{ animationDelay: "0.7s" }}>
              Most directories take your money and show you nothing. We email you every month with how many riders saw your profile, how many clicked to call, and how many got in touch — including the months when the answer is none.
            </p>
            <div className="fade-in flex flex-col gap-2 wide:flex-row wide:gap-2.5" style={{ animationDelay: "0.85s" }}>
              <Link href="/signup?role=coach&plan=founding" className="block rounded-[10px] bg-accent px-[26px] py-[15px] text-center text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:py-4">
                Join as a founding coach
              </Link>
              <Link href="#included" className="block rounded-[10px] border border-ink-fg/40 px-[26px] py-3.5 text-center text-[16px] font-medium text-ink-fg transition-colors duration-[250ms] hover:bg-ink-fg/10 wide:py-[15px]">
                See what&rsquo;s included
              </Link>
            </div>
          </div>
        </div>
      </section>
      <PromiseTicker />

      {/* ── 2. Founding + the monthly email ─────────────────────────────── */}
      <div className="mx-auto wide:max-w-[1184px] wide:px-12 wide:pt-[88px]">
        <Reveal className="wide:grid wide:grid-cols-2 wide:items-center wide:gap-14">
          <section className="founding relative overflow-hidden bg-ink-deep px-[18px] py-16 text-ink-fg wide:flex wide:min-h-[560px] wide:flex-col wide:justify-end wide:rounded-[20px] wide:px-11 wide:py-[52px]">
            <picture>
              <source type="image/avif" srcSet={srcset("founding", "avif", [640, 1024, 1400])} sizes="(min-width: 1100px) 560px, 100vw" />
              <source type="image/webp" srcSet={srcset("founding", "webp", [640, 1024, 1400])} sizes="(min-width: 1100px) 560px, 100vw" />
              <img src="/hero/founding-1024.jpg" alt="" loading="lazy" decoding="async" data-parallax="drift" data-parallax-speed="0.1" className="founding__img parallax-drift absolute inset-0 h-full w-full object-cover opacity-35 wide:opacity-40" />
            </picture>
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,24,18,.55),rgba(13,24,18,.85))] wide:bg-[linear-gradient(180deg,rgba(13,24,18,.2),rgba(13,24,18,.9)_70%)]" />
            <div className="relative">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-peach wide:tracking-[0.2em]">Founding coaches</p>
              <h2 className="mt-3 text-[38px] leading-none -tracking-[0.02em] wide:mt-3.5 wide:text-[46px]">
                Every coach who signs up in our first <em className="text-peach">six months</em>
              </h2>
              <p className="mt-4 text-[16px] leading-[1.55] text-ink-fg/85 wide:mt-[18px]">
                gets Spotlight free for six months, and $9.99 locked in for as long as they stay — even after the price goes up for everyone else. In return we ask for a complete profile: a photo, a real bio, your disciplines tagged and your location set. You&rsquo;re making an empty directory look alive, and that&rsquo;s worth something to us.
              </p>
              <Link href="/signup?role=coach&plan=founding" className="mt-[22px] inline-block rounded-[10px] bg-accent px-[22px] py-3.5 text-[16px] font-semibold text-accent-fg transition-colors duration-[250ms] hover:bg-accent-hover wide:mt-6 wide:px-6">
                Claim a founding spot
              </Link>
            </div>
          </section>

          <section className="px-[18px] pt-14 wide:px-0 wide:pt-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">Every month, good or quiet</p>
            <h2 className="mt-2.5 text-[38px] leading-none -tracking-[0.02em] text-ink wide:mt-3 wide:text-[46px]">The monthly email, shown</h2>
            <div className="mt-6">
              <MonthlyEmailExample />
            </div>
          </section>
        </Reveal>
      </div>

      {/* ── 3. What we actually do ──────────────────────────────────────── */}
      <Reveal as="section" className="mt-14 bg-ink text-ink-fg wide:mt-[88px]">
        <div id="included" className="mx-auto max-w-[1184px] scroll-mt-20 px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.5fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
          <div className="wide:sticky wide:top-[100px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-fg/60 wide:tracking-[0.2em]">What&rsquo;s included</p>
            <h2 className="mt-3 text-[38px] leading-none -tracking-[0.02em] wide:mt-4 wide:text-[60px] wide:leading-[0.98] wide:-tracking-[0.025em]">
              What we actually do to bring <em className="text-peach">riders</em> to you
            </h2>
            <p className="mt-[22px] hidden text-[16px] font-medium text-peach wide:block">All of that happens whether you&rsquo;re on Listed or Clinic.</p>
          </div>
          <div className="mt-7 flex flex-col border-t border-ink-fg/20 wide:mt-0">
            {WHAT_WE_DO.map((row, i) => (
              <div key={row.title} className="grid grid-cols-[36px_1fr] gap-2.5 border-b border-ink-fg/20 py-[18px] wide:grid-cols-[48px_1fr] wide:gap-4 wide:py-[22px]">
                <span className="pt-0.5 font-display text-[22px] italic leading-none text-peach wide:text-[26px]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="font-display text-[21px] leading-[1.15] wide:text-[25px]">{row.title}</div>
                  <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-fg/75 wide:mt-2 wide:max-w-[60ch] wide:text-[15.5px]">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-[22px] text-[15px] font-medium text-peach wide:hidden">All of that happens whether you&rsquo;re on Listed or Clinic.</p>
        </div>
      </Reveal>

      {/* ── 4. Plans + comparison ───────────────────────────────────────── */}
      <Reveal>
        <Plans tiers={TIERS} rows={COMPARISON_ROWS} />
      </Reveal>

      {/* ── 5. No commission ────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-[18px] mt-14 rounded-[16px] bg-ink-deep px-6 py-9 text-center text-ink-fg wide:mx-0 wide:mt-[88px] wide:rounded-none wide:px-12 wide:py-24">
        <p className="mx-auto font-display text-[34px] leading-[1.02] -tracking-[0.02em] wide:max-w-[18ch] wide:text-[64px] wide:leading-none wide:-tracking-[0.025em]">
          We never take a <em className="text-peach">percentage</em> of a lesson.
        </p>
        <p className="mx-auto mt-3.5 text-[15px] leading-[1.5] text-ink-fg/80 wide:mt-[22px] wide:max-w-[48ch] wide:text-[18px]">
          A flat monthly fee and nothing else, forever. What a rider pays you is between you and them.
        </p>
      </Reveal>

      {/* ── 6. FAQ + feedback ───────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] py-14 wide:grid wide:grid-cols-[1fr_1.6fr] wide:items-start wide:gap-16 wide:px-12 wide:py-[88px]">
        <div className="wide:sticky wide:top-[100px]">
          <h2 className="text-[38px] leading-none -tracking-[0.02em] text-ink wide:text-[64px] wide:leading-[0.98] wide:-tracking-[0.025em]">Questions</h2>
          <div className="feedback mt-8 hidden rounded-[16px] bg-shade px-6 py-[26px] wide:block">
            <p className="font-display text-[26px] leading-[1.1] text-ink">Tell us what to fix</p>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-muted">
              This site is new and we&rsquo;d rather hear what&rsquo;s not working from you than guess. If something&rsquo;s confusing, missing, or just annoying, tell Kim or Alana directly — every founding coach gets a direct line to us, not a support ticket.
            </p>
          </div>
        </div>
        <div>
          <div className="mt-5 wide:mt-0">
            <Accordion items={FAQ_ITEMS} />
          </div>
          <div className="feedback mt-7 rounded-[16px] bg-shade px-5 py-6 wide:hidden">
            <p className="font-display text-[24px] leading-[1.1] text-ink">Tell us what to fix</p>
            <p className="mt-2.5 text-[14.5px] leading-[1.55] text-muted">
              This site is new and we&rsquo;d rather hear what&rsquo;s not working from you than guess. If something&rsquo;s confusing, missing, or just annoying, tell Kim or Alana directly — every founding coach gets a direct line to us, not a support ticket.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
