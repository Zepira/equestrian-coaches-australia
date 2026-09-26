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
  {
    slug: "coming-soon",
    name: "Coming soon page",
    href: "/",
    keys: ["coming_soon"],
    revalidate: ["/"],
    note: "The whole public site until launch. Shown at / while SITE_LAUNCHED is off, so editing it after launch changes nothing a visitor sees.",
  },
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
  { slug: "review-policy", name: "Review policy", href: "/review-policy", keys: ["review_policy"], revalidate: ["/review-policy"], note: "What gets a review taken down is the list the Reviews screen offers. Change one, change both: ask for the screen to match." },
  { slug: "competitions", name: "Competitions pages", href: "/competitions", keys: ["competitions.words", "competitions.terms"], revalidate: ["/competitions", ["/competitions/[slug]", "page"]], note: "The terms fill themselves in from each competition's fields. Square brackets are for the solicitor." },
  { slug: "riders-choice", name: "Riders' choice rules", href: "/riders-choice", keys: ["riders_choice.rules"], revalidate: ["/riders-choice"], note: "The rules are also the code that works out the winners (src/lib/awards.ts). Change one, change both: ask for the code to match. {min_reviews} is a setting." },
  {
    slug: "billing",
    name: "Leaving and pausing",
    href: "/dashboard/billing/cancel",
    keys: ["billing.leaving"],
    revalidate: ["/dashboard/billing", "/dashboard/billing/cancel"],
    note: "{listed} and {listed_price} fill themselves in from the plans. One reason per line.",
  },
  { slug: "guides", name: "Guides pages", href: "/guides", keys: ["guides.words"], revalidate: ["/guides", ["/guides/[slug]", "page"]], note: "The guides themselves are on Admin → Guides. {plural} is a profession, like farriers." },
  {
    slug: "reviews",
    name: "Review pages",
    href: "/review-policy",
    keys: ["reviews.words"],
    revalidate: [["/review/[slug]", "page"], ["/enquiry/[token]", "page"], "/review/confirm"],
    note: "{name} is the professional, {audience_plural} is riders or horse owners.",
  },
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
    note: "For the solicitor to check. {contact_email} and {enquiry_months} (a setting) fill themselves in. Mark it approved on the Settings tab.",
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
  review_policy: "Review policy",
  "reviews.words": "Review form and follow-up",
  "guides.words": "Guides pages",
  "billing.leaving": "Leaving, pausing and paying yearly",
  "competitions.words": "Competitions pages",
  "competitions.terms": "Competition terms",
  "riders_choice.rules": "Riders' choice rules",
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

const SEQ_PRO_VARS = [
  v("first_name", "Their first name", "Jane"),
  v("audience_plural", "riders or horse owners", "riders"),
  v("onboarding_url", "Where they left off", "https://equineprofessionals.com.au/onboarding"),
  v("contact_email", "Our address", "hello@equineprofessionals.com.au"),
];
const SEQ_ONBOARDING_VARS = [
  v("first_name", "Their first name", "Jane"),
  v("audience_plural", "riders or horse owners", "riders"),
  v("pct", "How complete the profile is", "60"),
  v("next_item", "The most useful thing left to do", "A photo of you coaching"),
  v("profile_edit_url", "Their profile editor", "https://equineprofessionals.com.au/dashboard/profile"),
  v("promote_url", "The Promote tab", "https://equineprofessionals.com.au/dashboard/promote"),
  v("reviews_url", "Their reviews and review link", "https://equineprofessionals.com.au/dashboard/reviews"),
  v("dashboard_url", "Their dashboard", "https://equineprofessionals.com.au/dashboard"),
  v("views", "Profile views, counted", "34 profile views"),
  v("reveals", "Taps to call, counted", "3 taps to call"),
  v("enquiries", "Enquiries, counted", "1 enquiry"),
];
const SEQ_BILLING_VARS = [
  v("first_name", "Their first name", "Jane"),
  v("billing_url", "Their billing page", "https://equineprofessionals.com.au/dashboard/billing"),
  v("leaving_url", "The page with move down, pause and cancel", "https://equineprofessionals.com.au/dashboard/billing/cancel"),
  v("first_charge_date", "When the founding free period ends", "30 April 2027"),
  v("listed", "The Listed plan's name", "Listed"),
  v("spotlight", "The Spotlight plan's name", "Spotlight"),
  v("founding_price", "The founding rate", "$9.99"),
  v("listed_price", "Listed's monthly price", "$9.99"),
  v("spotlight_price", "Spotlight's monthly price", "$24.95"),
  v("listed_tagline", "Listed's one-line description", "A complete listing"),
  v("spotlight_tagline", "Spotlight's one-line description", "Featured, with the full numbers"),
  v("pause_months", "The longest pause, in words", "three"),
  v("views", "Profile views, counted", "120 profile views"),
  v("reveals", "Taps to call, counted", "9 taps to call"),
  v("enquiries", "Enquiries, counted", "4 enquiries"),
  v("plan", "Their plan", "Spotlight"),
  v("monthly", "Their plan's monthly price", "$24.95"),
  v("yearly", "Their plan's yearly price", "$249"),
  v("saving", "What yearly saves over twelve months", "$50.40"),
];
const SEQ_RIDER_VARS = [
  v("first_name", "Their first name", "Sam"),
  v("account_url", "Their account", "https://equineprofessionals.com.au/account"),
  v("alerts_url", "Their alerts", "https://equineprofessionals.com.au/account#alerts"),
];

export const EMAILS: EmailEntry[] = [
  {
    key: "email.waitlist",
    name: "Waitlist confirmation",
    to: "Anyone who signs up on the coming soon page",
    when: "Straight after they join the list, before launch.",
    // Confirms something they just did and promotes nothing.
    class: "factual",
    vars: [v("unsubscribe_url", "Takes them off the waitlist", "https://equineprofessionals.com.au/unsubscribe?w=test")],
  },
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
    key: "email.seq.unfinished_signup.1",
    name: "Unfinished sign-up, 1",
    class: "factual",
    to: "A professional with a draft profile",
    when: "A day after they signed up without sending the profile in (Admin → Sequences).",
    vars: SEQ_PRO_VARS,
  },
  {
    key: "email.seq.unfinished_signup.2",
    name: "Unfinished sign-up, 2",
    class: "factual",
    to: "A professional with a draft profile",
    when: "Days after the first, while it's still a draft.",
    vars: SEQ_PRO_VARS,
  },
  {
    key: "email.seq.unfinished_signup.3",
    name: "Unfinished sign-up, 3",
    class: "factual",
    to: "A professional with a draft profile",
    when: "The last one, while it's still a draft.",
    vars: SEQ_PRO_VARS,
  },
  { key: "email.seq.onboarding.1", name: "New profile, 1: finish it", class: "factual", to: "A newly published professional", when: "Days after going live, unless the profile is already complete enough.", vars: SEQ_ONBOARDING_VARS },
  { key: "email.seq.onboarding.2", name: "New profile, 2: share it", class: "factual", to: "A newly published professional", when: "The next step of the same sequence.", vars: SEQ_ONBOARDING_VARS },
  { key: "email.seq.onboarding.3", name: "New profile, 3: reviews", class: "factual", to: "A newly published professional", when: "The next step of the same sequence.", vars: SEQ_ONBOARDING_VARS },
  { key: "email.seq.onboarding.4", name: "New profile, 4: first numbers", class: "factual", to: "A newly published professional", when: "The last step, about two weeks in.", vars: SEQ_ONBOARDING_VARS },
  {
    key: "email.seq.first_win.1",
    name: "First enquiry",
    class: "factual",
    to: "A professional",
    when: "Their first enquiry, or the first time someone taps to see their number.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("what_happened", "What happened, as a sentence start", "Someone sent you an enquiry"),
      v("enquiries_url", "Their enquiries", "https://equineprofessionals.com.au/dashboard/enquiries"),
    ],
  },
  { key: "email.seq.rider_welcome.1", name: "Rider welcome, 1", class: "factual", to: "A new rider or horse owner", when: "Soon after they make an account, unless they already have an alert.", vars: SEQ_RIDER_VARS },
  { key: "email.seq.rider_welcome.2", name: "Rider welcome, 2", class: "factual", to: "A new rider or horse owner", when: "Days later, while they still have no alert.", vars: SEQ_RIDER_VARS },
  { key: "email.seq.rider_welcome.3", name: "Rider welcome, 3", class: "factual", to: "A new rider or horse owner", when: "The last one, while they still have no alert.", vars: SEQ_RIDER_VARS },
  {
    key: "email.guide_download",
    name: "A guide's download",
    class: "factual",
    to: "Someone who asked for a guide's file",
    when: "Straight after they ask for it on the guide.",
    vars: [
      v("download_title", "What the file is", "horse care calendar"),
      v("download_url", "The file", "https://equineprofessionals.com.au/storage/calendar.pdf"),
      v("guide_title", "The guide it came with", "Getting your horse's feet through winter"),
      v("guide_url", "The guide", "https://equineprofessionals.com.au/guides/winter-feet"),
    ],
  },
  { key: "email.seq.founding_conversion.1", name: "Founding: two months to go", class: "commercial", to: "Founding members who agreed to news", when: "60 days before their free period ends.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.founding_conversion.2", name: "Founding: the two plans", class: "commercial", to: "Founding members who agreed to news", when: "The next step, unless they've chosen a plan.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.founding_conversion.3", name: "Founding: before you leave", class: "commercial", to: "Founding members who agreed to news", when: "The last step, unless they've chosen a plan.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.annual_offer.1", name: "Pay yearly, 1", class: "commercial", to: "Monthly professionals who agreed to news", when: "At the start of their third paid month.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.annual_offer.2", name: "Pay yearly, 2", class: "commercial", to: "Monthly professionals who agreed to news", when: "Two weeks later, if they're still monthly.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.win_back.1", name: "Come back, 1", class: "commercial", to: "Professionals who cancelled and agreed to news", when: "30 days after the plan ended.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.win_back.2", name: "Come back, 2", class: "commercial", to: "Professionals who cancelled and agreed to news", when: "60 days after, unless they're back.", vars: SEQ_BILLING_VARS },
  { key: "email.seq.win_back.3", name: "Come back, 3", class: "commercial", to: "Professionals who cancelled and agreed to news", when: "90 days after, unless they're back.", vars: SEQ_BILLING_VARS },
  {
    key: "email.seq.quiet_rider.1",
    name: "Still want our emails?",
    class: "factual",
    to: "Riders we haven't seen for a long while",
    when: "After the quiet_rider_days setting with no sign-in, click, alert change, save or enquiry. If they don't press the button, their emails stop at the next step.",
    vars: [
      v("first_name", "Their first name", "Sam"),
      v("keep_url", "The keep-my-emails button", "https://equineprofessionals.com.au/email-preferences/keep?t=test"),
      v("stop_date", "When emails stop without an answer", "12 November"),
    ],
  },
  {
    key: "email.competition_confirm",
    name: "Confirm a competition entry",
    class: "factual",
    to: "Someone who entered a competition",
    when: "Straight after they enter. The entry only counts once they confirm.",
    vars: [
      v("competition", "The competition", "Best photo with your coach"),
      v("confirm_url", "The confirm page", "https://equineprofessionals.com.au/competitions/confirm?t=test"),
    ],
  },
  {
    key: "email.competition_winner",
    name: "Competition winner",
    class: "factual",
    to: "A competition winner",
    when: "When the result is published.",
    vars: [
      v("first_name", "Their first name", "Sam"),
      v("competition", "The competition", "Best photo with your coach"),
      v("prize", "The prize", "A lesson package with a coach of your choice"),
      v("contact_email", "Our address", "hello@equineprofessionals.au"),
      v("competition_url", "The competition page", "https://equineprofessionals.com.au/competitions/best-photo"),
    ],
  },
  {
    key: "email.sequence_footer",
    name: "Sequence email footer",
    class: "factual",
    to: "Everyone in a sequence",
    when: "Added to the end of every sequence email.",
    vars: [v("stop_url", "Stops the rest of this sequence", "https://equineprofessionals.com.au/email-preferences/sequence?t=test")],
  },
  {
    key: "email.enquiry_followup",
    name: "Did you book?",
    class: "factual",
    to: "Someone who sent an enquiry by email",
    when: "Once, a set number of days after the enquiry (Admin → Reviews). Not if they've already answered or reviewed.",
    vars: [
      v("rider_first", "Their first name", "Sam"),
      v("name", "The professional", "Jane Smith"),
      v("enquiry_date", "When they enquired", "3 October"),
      v("answer_url", "The page with the yes and no buttons", "https://equineprofessionals.com.au/enquiry/test"),
    ],
  },
  {
    key: "email.review_confirm",
    name: "Confirm a review",
    class: "factual",
    to: "Someone who wrote a review from a professional's link",
    when: "Straight after they send it. The review isn't posted until they press the link.",
    vars: [
      v("name", "The professional", "Jane Smith"),
      v("confirm_url", "The confirm page", "https://equineprofessionals.com.au/review/confirm?t=test"),
    ],
  },
  {
    key: "email.review_published",
    name: "New review",
    class: "factual",
    to: "The professional",
    when: "A review of them goes up.",
    vars: [
      v("first_name", "Their first name", "Jane"),
      v("author", "Who wrote it, as shown", "Sam R."),
      v("rating", "Stars, 1 to 5", "5"),
      v("review", "What they wrote", "Patient and clear. My mare loads first time now."),
      v("reviews_url", "Their reviews page", "https://equineprofessionals.com.au/dashboard/reviews"),
      v("policy_url", "The review policy", "https://equineprofessionals.com.au/review-policy"),
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
