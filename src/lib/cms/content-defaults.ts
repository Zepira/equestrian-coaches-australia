/**
 * Page copy held in content_blocks (The Site as a CMS §04 G): the default
 * for every block, which is also what the seed writes and what a page shows
 * if its row is missing or fails validation. Today's copy, 24 Sep 2026.
 *
 * No imports, on purpose: scripts/db/seed-content.mjs loads this file with
 * Node's type stripping.
 *
 * Copy that names a price uses a variable instead of a number:
 * {listed_price}, {top_price}. They're filled from the plans setting when
 * the page renders (fillVariables in ./read.ts). `**words**` is bold
 * (RichText) and a line break in a title is where it breaks on wide screens.
 */

export type Items = { title: string; body: string }[];

export const CONTENT_DEFAULTS = {
  "home.hero": {
    eyebrow: "For riders and horse owners, Australia-wide",
    words: ["The", "people", "your", "horse", "needs,", "near", "you."],
    emphasis: [3],
    lead: "Riding coaches, farriers, vets, dentists and the rest, found by what you need and where you keep your horse. Free for riders and horse owners.",
    leadShort: "Coaches, farriers, vets and the rest, near where you keep your horse.",
  },
  "home.principles": {
    items: [
      { title: "Free for riders", body: "Searching, saving favourites and getting in touch cost you nothing." },
      { title: "Professionals pay to list", body: "Coaches and horse care professionals pay a flat monthly fee for their profile. That's where our money comes from." },
      { title: "You deal with them directly", body: "Phone, email or the form on their profile. We don't take a booking fee or a cut of the lesson or visit." },
      { title: "We don't vet anyone", body: "Profiles are written by the people on them. We don't check qualifications or accredit anyone, so ask what you'd ask anyone new." },
    ] as Items,
  },
  "door.coaches.hero": {
    eyebrow: "Riding coaches, Australia-wide",
    cycle: ["dressage", "western", "liberty", "show jumping", "eventing", "campdrafting", "bridleless", "pony club"],
  },
  "door.horse_care.hero": {
    eyebrow: "Horse care, Australia-wide",
    words: ["Find", "a"],
    lead: "Farriers, dentists, bodyworkers and the rest, found by what your horse needs and where it lives. Free for horse owners.",
    leadShort: "Farriers, dentists, bodyworkers and more, near where your horse lives.",
  },
  "door.horse_care.steps": {
    items: [
      { title: "Tell us what your horse needs, and where", body: "Pick the kind of help and the suburb your horse lives in. Every listing is a real person, not a booking agency." },
      { title: "See who covers your paddock", body: "Each professional sets their own travel radius and lists the work they actually do." },
      { title: "Get in touch, direct", body: "No commission and no booking fee. You sort out the visit with them yourself." },
    ] as Items,
  },
  "door.horse_care.pitch": {
    eyebrow: "For professionals",
    title: "Be the one\nthey call.",
    body: "A profile with your specialities, how far you travel and a contact form, from **{listed_price} a month**. Owners contact you directly, and we take nothing from the job.",
    button: "List your business",
  },
  "list_your_business": {
    eyebrow: "List your business",
    headline: "Be found by the people",
    headlineEmphasis: "near you.",
    lead: "One profile and a flat monthly fee, from {listed_price}. Riders and horse owners find you by what you do and where you work, then contact you directly. We don't take a cut of any lesson or visit.",
    coachesTitle: "Riding coaches",
    coachesBody: "Dressage, western, liberty, pony club and every other discipline. Show what you teach, how far you travel and whether you're taking new students.",
    horseCareTitle: "Horse care professionals",
    horseCareBody: "List your specialities, the area you cover and how owners can reach you.",
    plansLine: "Plans run from {listed_price} to {top_price} a month, and you can change plan or cancel whenever you like.",
  },
  // The monthly numbers email to providers (§08.2). Variables, counted so
  // they read right at one: {searches} ("1 search", "12 searches"),
  // {people_viewed}, {people_tapped}, {people_enquired} ("1 person",
  // "3 people"), {view_count} ("1 profile view"), {enquiry_count}
  // ("2 enquiries"); and {first_name}, {month}, {audience} (the
  // profession's audience noun, plural: "riders", "horse owners"),
  // {next_step} (a completeness item's label), {dashboard_url},
  // {profile_url}. The outcome line only appears when there were enquiries.
  "email.monthly": {
    subject: "Your {month} on Equine Professionals Australia",
    busyIntro: "In {month} you came up in {searches} on the site. {people_viewed} opened your profile, {people_tapped} tapped to see your number and {people_enquired} sent an enquiry.",
    quietIntro: "{month} was quiet on the site: {view_count} and {enquiry_count}. That's the honest number, and what's below is what's most likely to change it.",
    outcome: "Did any of those enquiries turn into work? Mark them in your dashboard so your numbers show what actually happened: {dashboard_url}",
    searches: "What {audience} near you searched for:",
    nextStep: "Next on your profile checklist: {next_step}.",
    share: "Share your profile where your {audience} already are, like your local Facebook groups: {profile_url}",
    signOff: "Your dashboard has the full picture: {dashboard_url}",
  },
  // Under the contact details on every profile (§08.4). {first_name}: the
  // provider's. Says the brand, never a section.
  "mention": {
    prompt: "When you get in touch, let {first_name} know you found them on Equine Professionals Australia.",
  },
  "footer": {
    tagline: "Riding coaches, farriers, vets and the rest of your horse's team, across Australia.",
  },
};

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
export type ContentValue<K extends ContentKey> = (typeof CONTENT_DEFAULTS)[K];
