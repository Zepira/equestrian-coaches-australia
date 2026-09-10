import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { Accordion } from "@/components/accordion";
import { MonthlyEmailExample } from "@/components/for-coaches/monthly-email-example";
import { disciplinePhoto } from "@/lib/mock-coaches";

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

type Tier = {
  key: string;
  name: string;
  monthly: string;
  yearly: string;
  tagline: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  { key: "listed", name: "Listed", monthly: "$9.99/mo", yearly: "$99/yr", tagline: "For most coaches" },
  {
    key: "spotlight",
    name: "Spotlight",
    monthly: "$24.95/mo",
    yearly: "$249/yr",
    tagline: "For coaches building a book",
    featured: true,
  },
  { key: "clinic", name: "Clinic", monthly: "$49.95/mo", yearly: "$499/yr", tagline: "For coaches who are already full" },
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

function Check() {
  return (
    <span className="text-accent" aria-label="Included">
      ✓
    </span>
  );
}

function Dash() {
  return (
    <span className="text-subtle" aria-hidden="true">
      —
    </span>
  );
}

export default function ForCoachesPage() {
  return (
    <div>
      {/* 1. Hero */}
      <section className="border-b border-border bg-shade">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="font-display text-4xl leading-tight text-fg sm:text-5xl">
            You&rsquo;ll know exactly what your listing did.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
            Most directories take your money and show you nothing. We email you every month with
            how many riders saw your profile, how many clicked to call, and how many got in
            touch — including the months when the answer is none.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <LinkButton href="/signup?role=coach" variant="primary">
              Join as a founding coach
            </LinkButton>
            <LinkButton href="#included" variant="secondary">
              See what&rsquo;s included
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Founding offer — moved up under the hero. Photo band, not flat
          cream, so it reads as a distinct moment rather than a repeat of
          the hero above it. */}
      <section
        className="relative overflow-hidden bg-ink bg-cover bg-center py-24 sm:py-28"
        style={{ backgroundImage: `url(${disciplinePhoto("pony-club", 1600)})` }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgb(13 24 18 / .78), rgb(13 24 18 / .70) 40%, rgb(13 24 18 / .82))",
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Founding coaches
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink-fg sm:text-4xl">
            Every coach who signs up in our first six months
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-fg/85">
            gets Spotlight free for six months, and $9.99 locked in for as long as they stay —
            even after the price goes up for everyone else. In return we ask for a complete
            profile: a photo, a real bio, your disciplines tagged and your location set.
            You&rsquo;re making an empty directory look alive, and that&rsquo;s worth something to
            us.
          </p>
          <LinkButton href="/signup?role=coach&plan=founding" variant="primary" className="mt-10">
            Claim a founding spot
          </LinkButton>
        </div>
      </section>

      {/* 2. The monthly email, shown */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-fg">The monthly email, shown</h2>
        </Reveal>
        <Reveal>
          <div className="mt-10">
            <MonthlyEmailExample />
          </div>
        </Reveal>
      </section>

      {/* 3. What we actually do */}
      <section id="included" className="border-t border-border bg-shade">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <h2 className="text-center font-display text-3xl text-fg">
              What we actually do to bring riders to you
            </h2>
          </Reveal>
          <div className="mt-12 divide-y divide-border border-t border-b border-border">
            {WHAT_WE_DO.map((row) => (
              <Reveal key={row.title}>
                <div className="grid gap-2 py-7 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8">
                  <div className="font-display text-[17px] text-fg">{row.title}</div>
                  <div className="text-[15px] leading-relaxed text-muted">{row.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-center text-sm font-medium text-fg">
            All of that happens whether you&rsquo;re on Listed or Clinic.
          </p>
        </div>
      </section>

      {/* 4. The three tiers */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-fg">Pick a plan</h2>
        </Reveal>
        <Reveal>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[15px] text-muted">
            Annual is ten months&rsquo; price. Change plan any time, both directions — a coach
            running a clinic in March goes up for March and back down in April.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <Reveal key={tier.key}>
              <div
                className={`flex h-full flex-col rounded-[var(--radius-tile)] border p-8 ${
                  tier.featured ? "border-accent bg-accent-soft" : "border-border bg-surface"
                }`}
              >
                {tier.featured && (
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">
                    Most popular
                  </div>
                )}
                <div className="font-display text-xl text-fg">{tier.name}</div>
                <div className="mt-1.5 text-sm text-subtle">{tier.tagline}</div>
                <div className="mt-5">
                  <div className="font-display text-3xl text-fg">{tier.monthly}</div>
                  <div className="mt-1 text-sm text-muted">or {tier.yearly}</div>
                </div>
                <LinkButton
                  href={`/signup?role=coach&plan=${tier.key}`}
                  variant={tier.featured ? "primary" : "secondary"}
                  className="mt-8"
                >
                  {tier.key === "listed"
                    ? "Join as a founding coach"
                    : `Choose ${tier.name}`}
                </LinkButton>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-fg">
          Listed comes with everything a coach needs to be found and reached — it isn&rsquo;t a
          cut-down plan. Travel radius is the same on every tier, not a paid feature.
        </p>

        {/* Full comparison table */}
        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 pr-4 text-left font-display text-base font-normal text-fg">
                  Feature
                </th>
                <th className="px-3 py-4 text-center font-display text-base font-normal text-fg">
                  Listed
                </th>
                <th className="px-3 py-4 text-center font-display text-base font-normal text-accent">
                  Spotlight
                </th>
                <th className="px-3 py-4 text-center font-display text-base font-normal text-fg">
                  Clinic
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <td className="py-4 pr-4 text-fg">{row.label}</td>
                  <td className="px-3 py-4 text-center">{row.listed ? <Check /> : <Dash />}</td>
                  <td className="px-3 py-4 text-center bg-accent-soft/40">
                    {row.spotlight ? <Check /> : <Dash />}
                  </td>
                  <td className="px-3 py-4 text-center">{row.clinic ? <Check /> : <Dash />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. No commission */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="font-display text-2xl leading-snug text-ink-fg sm:text-3xl">
            We never take a percentage of a lesson.
          </p>
          <p className="mt-4 text-[17px] text-ink-fg/85">
            A flat monthly fee and nothing else, forever. What a rider pays you is between you and
            them.
          </p>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-fg">Questions</h2>
        </Reveal>
        <div className="mt-10">
          <Accordion items={FAQ_ITEMS} />
        </div>

        {/* Feedback — not an FAQ item, its own closing note under the accordion */}
        <Reveal>
          <div className="mt-10 rounded-[var(--radius-tile)] border border-border bg-shade p-6 text-center">
            <p className="font-display text-lg text-fg">Tell us what to fix</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              This site is new and we&rsquo;d rather hear what&rsquo;s not working from you than
              guess. If something&rsquo;s confusing, missing, or just annoying, tell Kim or Alana
              directly — every founding coach gets a direct line to us, not a support ticket.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
