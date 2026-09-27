/**
 * Every admin screen, grouped by the job you came to do rather than by the
 * shape of the data. The rail, the overview at /admin and the eyebrow above
 * each screen all read this list, so a label changes in one place.
 *
 * Routes are unchanged on purpose: only the words and the grouping moved.
 */
export type AdminSection = { href: string; label: string; blurb: string };
export type AdminGroup = { id: string; name: string; blurb: string; sections: AdminSection[] };

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "check",
    name: "To check",
    blurb: "Things waiting on a person before they go live.",
    sections: [
      { href: "/admin/review", label: "New profiles", blurb: "Approve or send back profiles before they show on the site." },
      { href: "/admin/reviews", label: "Rider reviews", blurb: "Reviews waiting to publish, and any a professional has reported." },
    ],
  },
  {
    id: "people",
    name: "People",
    blurb: "Who is signed up, and who is waiting to be.",
    sections: [
      { href: "/admin/providers", label: "Professionals", blurb: "Everyone with a profile. Find one, check a registration, or hide a profile." },
      { href: "/admin/invites", label: "Invitations", blurb: "Send someone a link that starts their profile for them." },
      { href: "/admin/riders", label: "Riders and owners", blurb: "How many there are and what they follow. Remove someone who asks." },
      { href: "/admin/waitlist", label: "Waitlist", blurb: "People who signed up on the coming soon page. Download the list." },
    ],
  },
  {
    id: "directory",
    name: "Directory",
    blurb: "What the site lists and how people search it.",
    sections: [
      { href: "/admin/professions", label: "Professions", blurb: "Coaches, farriers and the rest: their names, wording and whether they're live." },
      { href: "/admin/disciplines", label: "Specialities", blurb: "Disciplines and specialities under each profession, with their pages and photos." },
      { href: "/admin/terms", label: "Skills and tags", blurb: "The skills and setup options professionals tick on their profile." },
      { href: "/admin/aliases", label: "Search words", blurb: "Other words people type that should find the same thing, like shoer for farrier." },
      { href: "/admin/areas", label: "Places", blurb: "Town and suburb pages, and the intro written for each one." },
    ],
  },
  {
    id: "words",
    name: "Website words",
    blurb: "The text visitors read, and the emails they get.",
    sections: [
      { href: "/admin/pages", label: "Page text", blurb: "Headings and copy on the site's pages, the FAQ and the legal pages." },
      { href: "/admin/emails", label: "Emails", blurb: "The words in every email the site sends to a person." },
      { href: "/admin/guides", label: "Guides", blurb: "Downloadable guides and the pages they sit on." },
      { href: "/admin/on-site", label: "Banners and pop-ups", blurb: "The announcement bar, the slide-in and landing pages." },
    ],
  },
  {
    id: "email",
    name: "Mailing list",
    blurb: "Who has agreed to hear from us, and what we send them.",
    sections: [
      { href: "/admin/audience", label: "Subscribers", blurb: "Everyone who agreed to emails, what they agreed to, and the launch email." },
      { href: "/admin/sequences", label: "Automatic emails", blurb: "Emails that go out by themselves after something happens. All off until switched on." },
      { href: "/admin/campaigns", label: "One-off emails", blurb: "Write an email and send it to a group you pick." },
    ],
  },
  {
    id: "promote",
    name: "Promotions",
    blurb: "Offers, prizes and tracking where people come from.",
    sections: [
      { href: "/admin/codes", label: "Discount codes", blurb: "Promo codes, and free months earned by referring someone." },
      { href: "/admin/links", label: "Tracked links", blurb: "Short links for posters and posts, and how many people each one sent." },
      { href: "/admin/competitions", label: "Competitions", blurb: "Run a competition: terms, entries and judging." },
      { href: "/admin/sponsors", label: "Sponsors", blurb: "Sponsored spots on the site and where their links go." },
      { href: "/admin/awards", label: "Riders' choice", blurb: "The yearly awards, counted from rider reviews." },
    ],
  },
  {
    id: "money",
    name: "Money and settings",
    blurb: "Prices, the founding offer and switches for the whole site.",
    sections: [
      { href: "/admin/plans", label: "Plans and prices", blurb: "What each plan costs and includes, checked against Stripe on save." },
      { href: "/admin/settings", label: "Settings", blurb: "Launch date, founding offer, who reviews new profiles, sample listings and the numbers that decide place pages." },
    ],
  },
  {
    id: "notes",
    name: "Notes",
    blurb: "The planning documents.",
    sections: [{ href: "/admin/handbook", label: "Handbook", blurb: "How the site is meant to work, written down as it was planned." }],
  },
];

export function findSection(pathname: string) {
  for (const group of ADMIN_GROUPS) {
    const section = group.sections.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
    if (section) return { group, section };
  }
  return null;
}
