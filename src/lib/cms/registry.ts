import type { ContentKey } from "@/lib/cms/content-defaults";

/**
 * Which content blocks make up each page, and what each email is (The Site as
 * a CMS §10, Pages and Emails). The admin screens are built from this: one
 * form per page, one editor per email, and every save revalidates the paths
 * listed here. A new block needs a default in content-defaults.ts and a line
 * here, nothing else.
 */

export type PageEntry = {
  slug: string;
  name: string;
  /** Where it is, for the "view" link. */
  href: string;
  keys: ContentKey[];
  /** Routes to revalidate on save: a path, or [path, "page" | "layout"] for a dynamic route. */
  revalidate: (string | [string, "page" | "layout"])[];
  note?: string;
};

export const PAGES: PageEntry[] = [
  { slug: "home", name: "Home page", href: "/", keys: ["home.hero", "home.principles"], revalidate: ["/"] },
  { slug: "coaches", name: "Coaches door", href: "/coaches", keys: ["door.coaches.hero"], revalidate: ["/coaches"] },
  {
    slug: "horse-care",
    name: "Horse care door",
    href: "/horse-care",
    keys: ["door.horse_care.hero", "door.horse_care.steps", "door.horse_care.pitch"],
    revalidate: ["/horse-care", "/for-professionals"],
    note: "The pitch block also heads /for-professionals, until a profession has its own pitch (Professions tab).",
  },
  { slug: "list-your-business", name: "List your business", href: "/list-your-business", keys: ["list_your_business"], revalidate: ["/list-your-business", "/for-professionals"] },
  {
    slug: "for-professionals",
    name: "Professionals pitch",
    href: "/for-professionals",
    keys: ["door.horse_care.pitch"],
    revalidate: ["/for-professionals", "/horse-care"],
    note: "Shared with the Horse care door. Each profession's own pitch and FAQ are on the Professions tab, and replace this when filled in.",
  },
  { slug: "for-coaches", name: "Coaches pitch: questions", href: "/for-coaches", keys: ["for_coaches.faq"], revalidate: ["/for-coaches"] },
  {
    slug: "about",
    name: "About",
    href: "/about",
    keys: ["about.opening", "about.why", "about.rider", "about.coach", "about.principles", "about.record", "about.cta"],
    revalidate: ["/about"],
    note: "The photos stay in code; ask for a change.",
  },
  { slug: "profiles", name: "Every profile", href: "/search", keys: ["mention"], revalidate: [["/profile/[slug]", "page"]] },
  { slug: "footer", name: "Footer", href: "/", keys: ["footer"], revalidate: [["/", "layout"]] },
  {
    slug: "terms",
    name: "Terms of service",
    href: "/terms",
    keys: ["legal.terms"],
    revalidate: ["/terms"],
    note: "For the solicitor to check. {founding_price}, {free_months} and {contact_email} fill themselves in. Mark it approved on the Settings tab.",
  },
  {
    slug: "privacy",
    name: "Privacy policy",
    href: "/privacy",
    keys: ["legal.privacy"],
    revalidate: ["/privacy"],
    note: "For the solicitor to check. {contact_email} fills itself in. Mark it approved on the Settings tab.",
  },
];

/** A readable name for each block, where the key alone isn't. */
export const BLOCK_NAMES: Partial<Record<ContentKey, string>> = {
  "home.hero": "Hero",
  "home.principles": "How the site works",
  "door.coaches.hero": "Hero",
  "door.horse_care.hero": "Hero",
  "door.horse_care.steps": "How it works",
  "door.horse_care.pitch": "The pitch to professionals",
  list_your_business: "Page words",
  "for_coaches.faq": "Questions",
  "about.opening": "Opening",
  "about.why": "Why we built it",
  "about.rider": "The rider",
  "about.coach": "The coach",
  "about.principles": "How we do things",
  "about.record": "For the record, and we're new",
  "about.cta": "Last panel",
  mention: "The line under the contact details",
  "legal.terms": "Terms of service",
  "legal.privacy": "Privacy policy",
  footer: "Tagline",
};

/** Help for fields whose name doesn't explain itself. Keyed by field name, used for every block. */
export const FIELD_HINTS: Record<string, string> = {
  words: "The headline, one word per line. It rises in word by word.",
  emphasis: "Which words are in italic, counting the first word as 0, separated by commas.",
  cycle: "The word that changes in the headline, one per line.",
  paragraphs: "One paragraph per box.",
  title: "*words* are in the accent italic.",
  body: "**words** are bold.",
  items: "Each item is a heading and a line or two under it.",
  facts: "Short label, then the fact.",
  sections: "A heading, then its text. A blank line starts a new paragraph.",
  updated: "The date line under the title.",
};

export type EmailVar = { name: string; what: string; sample: string };
export type EmailEntry = { key: ContentKey; name: string; to: string; when: string; vars: EmailVar[] };

const v = (name: string, what: string, sample: string): EmailVar => ({ name, what, sample });

const RIDER_ALERT_VARS = [
  v("account_url", "Their alerts page", "https://equineprofessionals.com.au/account"),
  v("unsubscribe_url", "One click stops this alert", "https://equineprofessionals.com.au/unsubscribe?a=test"),
];

export const EMAILS: EmailEntry[] = [
  {
    key: "email.enquiry",
    name: "New enquiry",
    to: "The professional",
    when: "Someone sends the form on their profile.",
    vars: [
      v("first_name", "The professional's first name", "Jane"),
      v("rider_name", "Who sent it", "Sam Rider"),
      v("rider_contact", "Their email or phone", "sam@example.com"),
      v("want", "What they're after, from the profession's enquiry options", "Regular lessons"),
      v("message", "What they wrote", "Could you help with my mare's canter transitions?"),
      v("dashboard_url", "The enquiries inbox", "https://equineprofessionals.com.au/dashboard/enquiries"),
    ],
  },
  {
    key: "email.live",
    name: "Profile is live",
    to: "The professional",
    when: "Their profile is published, by review or straight away.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("pages", "Every page they appear on, one per line", "Your profile: https://equineprofessionals.com.au/profile/jane-smith\nThe farriers page: https://equineprofessionals.com.au/farriers"),
      v("suburb", "Where they're based", "Bendigo"),
    ],
  },
  {
    key: "email.changes",
    name: "Changes asked for",
    to: "The professional",
    when: "A reviewer asks for changes before publishing.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("note", "The reviewer's note", "Could you add a photo of you at work?"),
      v("preview_url", "Where they fix it and send it again", "https://equineprofessionals.com.au/onboarding?step=preview"),
    ],
  },
  {
    key: "email.rider_event",
    name: "Event near you",
    to: "Riders and horse owners with a matching alert",
    when: "A professional lists an event that matches their alert.",
    vars: [
      v("event_title", "The event's name", "Liberty groundwork clinic"),
      v("event_date", "When it starts", "12 October 2026"),
      v("event_place", "Where", "Bendigo Equestrian Centre"),
      v("host", "Who runs it", "Jane Smith"),
      v("event_url", "Its page", "https://equineprofessionals.com.au/events/test"),
      ...RIDER_ALERT_VARS,
    ],
  },
  {
    key: "email.rider_new_provider",
    name: "Someone new near you",
    to: "Riders and horse owners with a matching alert",
    when: "A matching professional's profile goes live near them. The headline line only shows when they have one.",
    vars: [
      v("name", "The professional's name", "Jane Smith"),
      v("singular", "Their profession, singular", "farrier"),
      v("a_singular", "The same with a or an", "a farrier"),
      v("place", "Where they're based", "Bendigo VIC"),
      v("headline", "Their headline", "Barefoot trims and remedial shoeing"),
      v("profile_url", "Their profile", "https://equineprofessionals.com.au/profile/jane-smith"),
      ...RIDER_ALERT_VARS,
    ],
  },
  {
    key: "email.rider_monthly",
    name: "Monthly round-up",
    to: "Riders and horse owners with alerts",
    when: "The 1st of the month, when there's something near them. The events and new people are listed by the site between the intro and the footer.",
    vars: [
      v("first_name", "Their first name", "Sam"),
      v("account_url", "Their alerts page", "https://equineprofessionals.com.au/account"),
      v("unsubscribe_url", "One click stops every email", "https://equineprofessionals.com.au/unsubscribe?r=test"),
    ],
  },
  {
    key: "email.monthly",
    name: "Monthly numbers",
    to: "Every published professional",
    when: "The 1st of the month, about the month before. The quiet intro is used when nobody viewed, tapped or enquired. The site adds a line per profession, the searches list and the checklist step when they apply.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("month", "The month it covers", "September"),
      v("searches", "Times in search, counted", "12 searches"),
      v("people_viewed", "People who opened the profile", "5 people"),
      v("people_tapped", "People who tapped to see the number", "2 people"),
      v("people_enquired", "People who sent an enquiry", "1 person"),
      v("view_count", "Profile views, for the quiet intro", "0 profile views"),
      v("enquiry_count", "Enquiries, for the quiet intro", "0 enquiries"),
      v("audience", "Who looks for them, plural", "horse owners"),
      v("next_step", "The next thing on their checklist", "A photo of you at work"),
      v("dashboard_url", "Their dashboard", "https://equineprofessionals.com.au/dashboard"),
      v("profile_url", "Their profile", "https://equineprofessionals.com.au/profile/jane-smith"),
    ],
  },
  {
    key: "email.founding_launch",
    name: "Launch day, founding members",
    to: "Founding members with a saved card",
    when: "Once, when the launch date is locked in Settings.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("launch_date", "Launch day", "1 November 2026"),
      v("first_charge_date", "Their first charge", "1 May 2027"),
      v("spotlight", "The free plan's name", "Spotlight"),
      v("listed", "The plan they move to", "Listed"),
      v("listed_price", "Its monthly price", "$9.99"),
      v("billing_url", "Their billing page", "https://equineprofessionals.com.au/dashboard/billing"),
    ],
  },
  {
    key: "email.founding_reminder",
    name: "First charge reminder",
    to: "Founding members in their free period",
    when: "30, 14 and 3 days before the first charge.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("days", "Days to go", "14"),
      v("first_charge_date", "Their first charge", "1 May 2027"),
      v("listed", "The plan they move to", "Listed"),
      v("listed_price", "Its monthly price", "$9.99"),
      v("billing_url", "Their billing page", "https://equineprofessionals.com.au/dashboard/billing"),
    ],
  },
];

export const emailBySlug = (slug: string) => EMAILS.find((e) => e.key === `email.${slug}`);
export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
