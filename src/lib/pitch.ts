import type { Plans as PlanSet } from "@/lib/tiers";

/**
 * The words that change between the two sign-up pitches, /for-coaches and
 * /for-professionals. Everything else on those pages (the plans, what each
 * plan includes, the founding offer, the monthly email) is the same product,
 * so it is written once here and in components/for-coaches/pitch-sections
 * and the two pages cannot drift apart.
 */
export type PitchWords = {
  /** "coach" / "professional" */
  provider: string;
  /** "riders" / "horse owners" */
  customers: string;
  /** "students" / "clients" */
  clients: string;
  /** what the free listing puts you on */
  listings: string;
  /** the remote-work row in the comparison */
  remote: string;
  /** who the benchmarks compare you with */
  peers: string;
  /** what we never take a percentage of */
  work: string;
  /** the change-plan example under "Pick a plan" */
  planExample: string;
  /** what a founding profile needs besides a photo, a bio and where you work */
  profileNeeds: string;
  /**
   * Plan taglines for this page. The `plans` setting's own taglines are
   * written for coaches ("For coaches building a book"), so a page for
   * anyone else says its own; unset means use the setting's.
   */
  taglines?: { listed: string; spotlight: string; clinic: string };
};

export const COACH_WORDS: PitchWords = {
  provider: "coach",
  customers: "riders",
  clients: "students",
  listings: "area and discipline pages",
  remote: "Remote / online lessons",
  peers: "similar coaches",
  work: "lesson",
  planExample: "a coach running a clinic in March goes up for March and back down in April",
  profileNeeds: "your disciplines",
};

export const PROFESSIONAL_WORDS: PitchWords = {
  provider: "professional",
  customers: "horse owners",
  clients: "clients",
  listings: "area and speciality pages",
  remote: "Remote consults, where your work allows them",
  peers: "others in your profession",
  work: "job",
  planExample: "someone running a hoof care workshop in March goes up for March and back down in April",
  profileNeeds: "your specialities",
  taglines: {
    listed: "For most professionals",
    spotlight: "For anyone building a client list",
    clinic: "For anyone who's already full",
  },
};

export type ComparisonRow = { label: string; listed: boolean; spotlight: boolean; clinic: boolean };

export function planFeatures(w: PitchWords) {
  const every = [
    "Profile page indexed by Google",
    `Listed on ${w.listings}`,
    "Travel radius you set yourself",
    w.remote,
    "Enquiry form",
    "Click-to-reveal contact",
    "Unlimited testimonials",
    `Taking-new-${w.clients} status (yes / waitlist / no)`,
    "One live event",
    "Profile views, contact reveals and enquiries",
    "The monthly numbers email",
  ];
  const spotlight = [
    "Featured slot on your area pages (labelled, capped at three, rotating)",
    "Instant enquiry alerts by email and SMS",
    "Enquiry inbox with outcomes",
    "Google search impressions and the queries you appeared for",
    "Full funnel and 12-month trend",
    "Intro video",
    "10 photos",
    "All contact methods, plus a link to your own website",
    "Testimonial request link: clients write their own, you choose what shows",
    "Pin a testimonial",
    "Unlimited events",
  ];
  const clinic = [
    `Your events pushed to ${w.customers} by email statewide`,
    "Each event gets its own indexed page Google can surface",
    "Waitlist capture for when you can't take anyone",
    `Benchmarks against ${w.peers}`,
    "Up to three locations",
  ];
  return { every, spotlight, clinic };
}

export function comparisonRows(w: PitchWords): ComparisonRow[] {
  const f = planFeatures(w);
  return [
    ...f.every.map((label) => ({ label, listed: true, spotlight: true, clinic: true })),
    ...f.spotlight.map((label) => ({ label, listed: false, spotlight: true, clinic: true })),
    ...f.clinic.map((label) => ({ label, listed: false, spotlight: false, clinic: true })),
  ];
}

export type TierCard = {
  key: string;
  name: string;
  monthly: string;
  yearly: string;
  tagline: string;
  summary: string;
  cta: string;
  featured?: boolean;
};

/**
 * The page's own words for each plan. Names, prices and taglines come from
 * the `plans` setting (getPlans), so they're never typed twice.
 */
export function tierCards(plans: PlanSet, w: PitchWords): TierCard[] {
  return [
    {
      key: "listed",
      ...plans.listed,
      ...(w.taglines && { tagline: w.taglines.listed }),
      summary: `Everything a ${w.provider} needs to be found and reached: an indexed profile, ${w.listings}, enquiries, testimonials and the monthly numbers email.`,
      cta: `Join as a founding ${w.provider}`,
    },
    {
      key: "spotlight",
      ...plans.spotlight,
      ...(w.taglines && { tagline: w.taglines.spotlight }),
      featured: true,
      summary: `Everything in ${plans.listed.name}, plus a featured slot on your area pages, instant enquiry alerts, search-query insights, an intro video and unlimited events.`,
      cta: `Choose ${plans.spotlight.name}`,
    },
    {
      key: "clinic",
      ...plans.clinic,
      ...(w.taglines && { tagline: w.taglines.clinic }),
      summary: `Everything in ${plans.spotlight.name}, plus your events pushed to ${w.customers} statewide, waitlist capture, benchmarks and up to three locations.`,
      cta: `Choose ${plans.clinic.name}`,
    },
  ];
}
