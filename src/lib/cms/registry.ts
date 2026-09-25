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
  /** Edited on Admin → On the site rather than the Pages list. */
  onSite?: boolean;
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
  { slug: "announcement", name: "Announcement bar", href: "/", keys: ["site.announcement"], revalidate: [["/", "layout"]], onSite: true },
  { slug: "slide-in", name: "Slide-in", href: "/", keys: ["site.slide_in"], revalidate: [["/", "layout"]], onSite: true },
  { slug: "how-we-list", name: "How the list is ordered", href: "/how-we-list", keys: ["how_we_list"], revalidate: ["/how-we-list"] },
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
  "site.announcement": "Announcement bar",
  "site.slide_in": "Slide-in",
  how_we_list: "How the list is ordered",
  "legal.terms": "Terms of service",
  "legal.privacy": "Privacy policy",
  footer: "Tagline",
};

/** Fields a block may leave empty (everything else must have words in it). */
export const OPTIONAL_FIELDS: Partial<Record<ContentKey, string[]>> = {
  "site.announcement": ["message", "linkLabel", "linkHref", "starts", "ends"],
};

/** Words a factual email mustn't contain: any promotion makes it commercial (§05.2). Checked with variables taken out. */
export const PROMOTIONAL = /\b(upgrade|spotlight|clinic plan|refer|referral|free month|discount|% off|what's new|new on the site|sponsor(ed)?|special offer|don't miss)\b/i;

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
  starts: "First day it shows, YYYY-MM-DD. Empty: from now.",
  ends: "Last day it shows, YYYY-MM-DD. Empty: until you clear the message.",
  audience: "everyone, logged_out, riders, coaches or horse_care.",
  message: "Empty turns the bar off.",
  linkHref: "Where the link goes: /coaches, or a full https:// address.",
};

export type EmailVar = { name: string; what: string; sample: string };
/**
 * factual: about the person's own account or something they asked for (an
 * enquiry, their bill, confirming an alert). commercial: anything that
 * promotes, including alerts about other people's services (The Marketing
 * Engine §05.2). A commercial email only goes with consent, and carries the
 * footer and one-click unsubscribe; a factual one mustn't promote anything,
 * which the save checks.
 */
export type EmailClass = "factual" | "commercial";
export type EmailEntry = { key: ContentKey; name: string; to: string; when: string; class: EmailClass; vars: EmailVar[] };

const v = (name: string, what: string, sample: string): EmailVar => ({ name, what, sample });

const RIDER_ALERT_VARS = [
  v("account_url", "Their alerts page", "https://equineprofessionals.com.au/account"),
  v("unsubscribe_url", "One click stops this alert", "https://equineprofessionals.com.au/unsubscribe?a=test"),
];

export const EMAILS: EmailEntry[] = [
  {
    key: "email.enquiry",
    name: "New enquiry",
    class: "factual",
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
    class: "factual",
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
    class: "factual",
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
    class: "commercial",
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
    class: "commercial",
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
    class: "commercial",
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
    class: "commercial",
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
    class: "factual",
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
    class: "factual",
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

EMAILS.push(
  {
    key: "email.alert_confirm",
    name: "Confirm an alert",
    class: "factual",
    to: "Someone who asked for an alert without an account",
    when: "They ask for an alert from a subscribe card. Nothing else is sent until they confirm.",
    vars: [
      v("what", "What they asked to hear about, with the place", "a new farrier starts near Kyneton VIC"),
      v("place", "Where, on its own (empty for a follow)", "Kyneton VIC"),
      v("confirm_url", "The button that starts the alert", "https://equineprofessionals.com.au/alerts/confirm?t=test"),
    ],
  },
  {
    key: "email.launch",
    name: "We've launched",
    class: "commercial",
    to: "Everyone who asked to hear when the site opened",
    when: "Once, when you press the button on the Audience screen. Each address gets it once, however often the button is pressed.",
    vars: [
      v("coaches_url", "The coaches section", "https://equineprofessionals.com.au/coaches"),
      v("horse_care_url", "The horse care section", "https://equineprofessionals.com.au/horse-care"),
      v("search_url", "The search page, where they can set up an alert", "https://equineprofessionals.com.au/search"),
    ],
  },
  {
    key: "email.renewal_reminder",
    name: "Yearly renewal reminder",
    class: "factual",
    to: "Professionals on a yearly plan",
    when: "30 days before a yearly plan renews.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("plan", "Their plan", "Spotlight"),
      v("renewal_date", "When it renews", "1 May 2027"),
      v("price", "What it costs", "$249"),
      v("billing_url", "Their billing page", "https://equineprofessionals.com.au/dashboard/billing"),
    ],
  }
);

export const emailBySlug = (slug: string) => EMAILS.find((e) => e.key === `email.${slug}`);
export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
