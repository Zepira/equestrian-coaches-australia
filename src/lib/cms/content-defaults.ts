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
  // /about. `*words*` is the accent italic; one paragraph per list item.
  "about.opening": {
    eyebrow: "About us",
    words: ["Finding", "a", "coach", "should", "be", "a", "search,", "not", "luck."],
    emphasis: [6, 8],
    lead: "Finding a riding coach in Australia still runs on word of mouth. You ask at a competition, you ask in a Facebook group, you ask the person whose horse goes the way you'd like yours to go.",
    paragraphs: ["It works, eventually, if you already know people. If you're new, or you've moved, or you want something more specific than general ridden work, it mostly doesn't."],
    closing: "We built this so that finding a coach is a search, not a stroke of luck.",
  },
  "about.why": {
    eyebrow: "Why we built it",
    title: "Alana found her coach *by accident.*",
    paragraphs: [
      "Kim's posts turned up on Instagram, and that was it. No directory, no search, no recommendation. There are very few coaches in Australia teaching what Kim teaches, and there was no way to go looking for one on purpose.",
    ],
    pullQuote: "Somewhere a rider is looking for a liberty coach, or a Western coach, or a dressage coach who works with nervous riders. Somewhere near them is exactly that person. *And neither of them will ever hear about the other.*",
    closing: "A directory is an unglamorous fix for that. But it is the fix.",
  },
  "about.rider": {
    eyebrow: "The rider",
    title: "I came to horses *late.*",
    paragraphs: [
      "My first lesson was at fifteen, which in pony-club terms is close to a mature-age student, and I bought my first horse at eighteen.",
      "My mare now is Rosie, a grey Australian Andalusian who would much rather learn a trick than do another twenty-metre circle. She is clever, opinionated and genuinely willing, which is a combination that doesn't let you get away with anything. Most of what I know about working *with* a horse rather than *at* one, I know because she made it clear when I'd asked badly.",
    ],
    closing: "I build software for a living. So I built this.",
    signature: "Alana",
    facts: [
      { title: "First lesson", body: "Fifteen" },
      { title: "First horse", body: "Eighteen" },
      { title: "Rides", body: "Rosie, a grey Australian Andalusian" },
      { title: "Day job", body: "Builds software" },
    ] as Items,
  },
  "about.coach": {
    eyebrow: "The coach",
    title: "What I'm after is *harmony.*",
    paragraphs: [
      "I coach foundational connection, lightness and body feel: the things that sit underneath every discipline, whether you're jumping, doing dressage or riding bridleless in an open paddock.",
      "I've been working with horses for most of my life, and teaching for a good part of it. I work with youngsters through to advanced horses, and with riders from their first lessons through to competition. My specialties are liberty, bridleless riding, classical dressage, showjumping and the transition to bitless, and a lot of what I teach is confidence, biomechanics and mindset as much as it is technique.",
      "What I'm actually after, in all of it, is a horse and rider who understand each other well enough that the aids stop being instructions and start being a conversation. Bridleless riding is the clearest test of that, but it isn't the point. The point is the partnership that makes it possible.",
    ],
    signature: "Kim",
    facts: [
      { title: "Teaches", body: "Connection, lightness and body feel" },
      { title: "Specialties", body: "Liberty, bridleless, classical dressage, showjumping, going bitless" },
      { title: "Works with", body: "Youngsters to advanced horses; first lessons to competition" },
      { title: "Listed here as", body: "A coach like any other" },
    ] as Items,
  },
  "about.principles": {
    eyebrow: "How we do things",
    title: "Five things we'd rather *say plainly.*",
    lead: "None of these are policies we might get around to. They're how the site already works.",
    items: [
      { title: "We don't take a commission.", body: "Coaches pay a flat monthly fee to be listed. What you agree with your coach is between you and your coach, and we never see a cent of it." },
      { title: "We don't vet coaches, and we'd rather say that plainly.", body: "We check that a listing belongs to a real person who agreed to be listed. We don't inspect facilities, verify qualifications or assess teaching. Ask the questions you'd ask anyone you were about to get on a horse for." },
      { title: "Nobody gets listed without saying yes.", body: "We don't scrape profiles or build pages about coaches who haven't heard of us." },
      { title: "We tell coaches the truth about their numbers.", body: "Every listed coach can see how many riders saw their profile and how many got in touch, including when the answer is none. A directory that hides that is selling hope." },
      { title: "We don't sell anyone's details.", body: "Not riders', not coaches'." },
    ] as Items,
  },
  "about.record": {
    recordEyebrow: "Who we are, for the record",
    recordTitle: "We're Alana and Kim, based in south-east Victoria, registering as a partnership.",
    recordBody: "Kim coaches, and she's listed on this site like any other coach. She gets no ranking advantage, no editorial preference and no discount. If that ever changes, we'll say so here.",
    newEyebrow: "We're new, and we'd rather say so",
    newTitle: "The coach list is still filling out.",
    newBody: "If there's nobody in your area yet, that's because we haven't reached them, not because they don't exist. Tell us who's missing, or tell your coach we're here.",
    email: "hello@equineprofessionals.au",
  },
  "about.cta": {
    title: "Two of us built it. *Riders and coaches* are what make it work.",
    ridersLabel: "Riders",
    ridersButton: "Find a coach",
    coachesLabel: "Coaches",
    coachesButton: "List your coaching",
    contactLine: "Questions, corrections, or a coach we should know about:",
  },
  // /for-coaches, the questions at the foot of the page.
  "for_coaches.faq": {
    items: [
      { title: "What if I don't get any enquiries?", body: "You'll know, because we'll tell you. The monthly email shows the real numbers whether they're good or not, and when it's quiet it says so and tells you what's most likely to change it. Cancel any time. No contract, no notice." },
      { title: "Can I cancel any time?", body: "Yes, one click in your dashboard. Your listing stays live until the end of the period you've paid for, and nothing you've added is deleted." },
      { title: "Do you take a cut of my lesson fees?", body: "No. Never. A flat monthly fee and nothing else." },
      { title: "What happens to my testimonials if I leave?", body: "They're yours. They stay on your profile if you come back, and we'll send you a copy if you ask." },
      { title: "Will you sell my details?", body: "No. Your contact details are shown to riders who click to see them, and that's it. We don't sell or rent our lists." },
      { title: "Do I need to be accredited?", body: "No. We list Western, liberty, natural horsemanship and trail coaches alongside accredited ones, because riders look for all of them. Any qualifications you upload are displayed as supplied by you. We don't verify or endorse anyone." },
      { title: "What if there aren't many coaches in my area?", body: "Then you're the answer to every search in it. We don't build an area page until three coaches exist there, so a thin area may take a while to get its own page, but your profile is live and findable from day one. We also switch the featured slot off in small areas, because being one of three isn't worth paying for." },
      { title: "How long before I see anything?", body: "Six to twelve months for Google traffic to build properly. That's normal for a new site and we'd rather say it than pretend otherwise. What moves first is your search impressions (how often you're appearing), and you'll see those from the start." },
    ] as Items,
  },
  // ── Emails ────────────────────────────────────────────────────────────────
  // Each one's variables are listed in src/lib/cms/registry.ts (EMAILS),
  // which is also where the admin screen gets the sample values for its
  // "send me a test" button.
  "email.enquiry": {
    subject: "New enquiry from {rider_name} via Equine Professionals Australia",
    body: "Hi {first_name},\n\n{rider_name} sent you an enquiry through your Equine Professionals Australia profile.\n\nLooking for: {want}\nContact: {rider_contact}\n\n\"{message}\"\n\nMark it replied or booked in your dashboard: {dashboard_url}",
  },
  "email.live": {
    subject: "Your profile is live",
    body: "Hi {first_name},\n\nYour profile is live. You can be found here:\n\n{pages}\n\nand in search whenever someone looks near {suburb}.\n\nEquine Professionals Australia",
  },
  "email.changes": {
    subject: "A couple of changes before your profile goes live",
    body: "Hi {first_name},\n\nWe had a look at your profile. Before it goes live:\n\n{note}\n\nMake the changes and send it again from here: {preview_url}\n\nEquine Professionals Australia",
  },
  "email.rider_event": {
    subject: "{event_title}, {event_date}",
    body: "{event_title}\n{event_date} · {event_place}\nRun by {host}.\n\nThe details: {event_url}",
    footer: "You're getting this because you set up an alert on Equine Professionals Australia. Change your alerts: {account_url}\nStop this alert: {unsubscribe_url}",
  },
  "email.rider_new_provider": {
    subject: "New near you: {name}, {singular}",
    body: "{name} has just listed as {a_singular} in {place}.",
    headline: "\"{headline}\"",
    profileLine: "Their profile: {profile_url}",
    footer: "You're getting this because you set up an alert on Equine Professionals Australia. Change your alerts: {account_url}\nStop this alert: {unsubscribe_url}",
  },
  "email.rider_monthly": {
    subject: "This month near you",
    intro: "Hi {first_name},\n\nHere's what's near you this month.",
    comingUp: "Coming up",
    newNearYou: "New near you",
    footer: "You get this once a month because you have alerts set up. Change them: {account_url}\nStop every email from us: {unsubscribe_url}",
  },
  "email.founding_launch": {
    subject: "We've launched: your first charge is on {first_charge_date}",
    body: "Hi {first_name},\n\nEquine Professionals Australia launched on {launch_date}. As a founding member you're on {spotlight} for free until {first_charge_date}. From then it's {listed} at {listed_price} a month, and that price stays yours for as long as you stay.\n\nYou can change plan or cancel before then from your dashboard: {billing_url}\n\nWe'll remind you 30, 14 and 3 days before.",
  },
  "email.founding_reminder": {
    subject: "Your first charge is in {days} days",
    body: "Hi {first_name},\n\nYour free founding period ends on {first_charge_date}. From then your plan is {listed} at {listed_price} a month, charged to the card you saved, and that price stays yours for as long as you stay.\n\nTo change plan or cancel before then: {billing_url}",
  },
};

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
export type ContentValue<K extends ContentKey> = (typeof CONTENT_DEFAULTS)[K];
