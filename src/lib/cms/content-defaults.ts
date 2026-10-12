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
  // `place` is the business's town, printed with the name and ABN in the
  // site footer and every marketing email (the Spam Act asks who sent it).
  "footer": {
    tagline: "Riding coaches, farriers, vets and the rest of your horse's team, across Australia.",
    place: "Buln Buln, Victoria",
    credit: "Site by Daiquiri Creative",
    creditUrl: "https://daiquiricreative.com.au/",
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
    email: "hello@equineprofessionals.com.au",
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
  // /for-professionals, the questions at the foot of the page. A
  // profession's own questions (profession_details.faq) show above these.
  "for_professionals.faq": {
    items: [
      { title: "What if I don't get any enquiries?", body: "You'll know, because we'll tell you. The monthly email shows the real numbers whether they're good or not, and when it's quiet it says so and tells you what's most likely to change it. Cancel any time. No contract, no notice." },
      { title: "Can I cancel any time?", body: "Yes, one click in your dashboard. Your listing stays live until the end of the period you've paid for, and nothing you've added is deleted." },
      { title: "Do you take a cut of what I charge?", body: "No. Never. A flat monthly fee and nothing else. What an owner pays you for a visit is between you and them." },
      { title: "What happens to my testimonials if I leave?", body: "They're yours. They stay on your profile if you come back, and we'll send you a copy if you ask." },
      { title: "Will you sell my details?", body: "No. Your contact details are shown to horse owners who click to see them, and that's it. We don't sell or rent our lists." },
      { title: "Do you check qualifications?", body: "No. Your profile says the details were supplied by you, and we don't verify or endorse anyone. The one exception is a protected title: physiotherapists and chiropractors are listed under equine physiotherapy and equine chiropractic, and the title itself only appears once we've checked your registration." },
      { title: "What if there aren't many of us in my area?", body: "Then you're the answer to every search in it. An area gets its own page once enough people are listed there, so a thin area may take a while to get one, but your profile is live and findable from day one. We also switch the featured slot off in small areas, because being one of three isn't worth paying for." },
      { title: "How long before I see anything?", body: "Six to twelve months for Google traffic to build properly. That's normal for a new site and we'd rather say it than pretend otherwise. What moves first is your search impressions (how often you're appearing), and you'll see those from the start." },
    ] as Items,
  },
  // ── Emails ────────────────────────────────────────────────────────────────
  // Each one's variables are listed in src/lib/cms/registry.ts (EMAILS),
  // which is also where the admin screen gets the sample values for its
  // "send me a test" button.
  /**
   * The coming soon page, which is the whole public site until SITE_LAUNCHED
   * is true (src/lib/launch.ts). Deliberately plain: no counts, no promises
   * about when, nothing that stops being true.
   */
  "coming_soon": {
    eyebrow: "Coming soon",
    title: "Coaches and *horse care* near you.",
    lead: "Find riding coaches and horse professionals near where you and your horse need them.",
    formTitle: "Hear when it opens",
    roleLabel: "I'm a",
    roleRider: "Rider or horse owner",
    roleCoach: "Riding coach",
    roleHorseCare: "Horse care professional",
    professionLabel: "What do you do?",
    professionAny: "Something else, or not sure yet",
    emailLabel: "Email",
    consent: "Email me when the site opens.",
    privacy: "That's the only thing we'll use your address for, and every email we send has an unsubscribe link.",
    button: "Join the list",
    success: "You're on the list. There's a confirmation on its way to your inbox.",
  },
  "email.waitlist": {
    subject: "You're on the list",
    body: "Thanks for putting your name down. We'll email you when Equine Professionals Australia opens.\n\nThat's the only reason we'll write. If you'd rather we didn't, or you didn't sign up for this, you can take yourself off the list here: {unsubscribe_url}\n\nEquine Professionals Australia",
  },
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
  "email.alert_confirm": {
    subject: "Confirm your alert",
    body: "Someone, hopefully you, asked us to email this address when {what}.\n\nTo start the alert, confirm here: {confirm_url}\n\nIf it wasn't you, ignore this email and we won't send anything else.",
  },
  // ── Sequences (The Marketing Engine M7). Each step is one block; the
  // delays and switches are on Admin → Sequences. All are factual: about the
  // person's own account, promoting nothing, and every one ends with the
  // email.sequence_footer line so a single click stops the rest.
  "email.seq.unfinished_signup.1": {
    subject: "Your profile is nearly there",
    body: "Hi {first_name},\n\nYou started a profile on Equine Professionals Australia but haven't sent it in yet. It picks up where you left off: {onboarding_url}\n\nIf something got in the way, write to us at {contact_email} and tell us what.",
  },
  "email.seq.unfinished_signup.2": {
    subject: "Your draft profile",
    body: "Hi {first_name},\n\nYour profile is saved as a draft. Nobody can see it until you send it in, and one of us looks at every profile before it goes live.\n\nCarry on here: {onboarding_url}",
  },
  "email.seq.unfinished_signup.3": {
    subject: "Last reminder about your draft",
    body: "Hi {first_name},\n\nThis is the last email we'll send about your draft profile. It stays there whenever you want to finish it: {onboarding_url}\n\nIf you've decided against listing, you don't need to do anything.",
  },
  "email.seq.onboarding.1": {
    subject: "Your profile is {pct}% complete",
    body: "Hi {first_name},\n\nYour profile is live and {pct}% complete. The thing that would help most next: {next_item}.\n\nPeople choose from what they can see, so a clear photo and a proper bio make a real difference. Edit your profile: {profile_edit_url}",
  },
  "email.seq.onboarding.2": {
    subject: "Where to put your profile link",
    body: "Hi {first_name},\n\nMost people who find you will come from your own link: in your Facebook posts, your email signature, a poster in the tack room.\n\nThe Promote tab has all of those ready, each with its own link so you can see what works: {promote_url}",
  },
  "email.seq.onboarding.3": {
    subject: "Ask your {audience_plural} for a review",
    body: "Hi {first_name},\n\nMost {audience_plural} read reviews before they get in touch. Send your review link to people you've worked with recently and ask them how it went: {reviews_url}\n\nEvery genuine review goes on your profile, and you can reply to each one.",
  },
  "email.seq.onboarding.4": {
    subject: "Your first two weeks",
    body: "Hi {first_name},\n\nSince your profile went live: {views}, {reveals} and {enquiries}.\n\nYou'll get these numbers every month from now on. The full picture is on your dashboard: {dashboard_url}",
  },
  "email.seq.first_win.1": {
    subject: "{what_happened}",
    body: "Hi {first_name},\n\n{what_happened} through your profile on Equine Professionals Australia.\n\nEnquiries wait for you in your dashboard, where you can mark each one as replied or booked: {enquiries_url}",
  },
  "email.seq.rider_welcome.1": {
    subject: "Your account on Equine Professionals Australia",
    body: "Hi {first_name},\n\nYour account is set up. Here's what it keeps for you.\n\nAnyone you save with the heart on their profile, so you can come back to them.\nAlerts, so we can email you when someone starts near you.\nThe enquiries you send, so you can see who you've contacted.\n\nYour account: {account_url}",
  },
  "email.seq.rider_welcome.2": {
    subject: "Hear when someone starts near you",
    body: "Hi {first_name},\n\nTell us where your horse lives and we'll email you when a coach, farrier or anyone else starts nearby. You choose who you want to hear about and how far away.\n\nSet it up here: {alerts_url}",
  },
  "email.seq.rider_welcome.3": {
    subject: "Following someone's clinic dates",
    body: "Hi {first_name},\n\nIf there's someone whose clinics or events you'd go to, open their profile and choose \"Get their clinic dates by email\". We'll tell you when they list one, wherever it is.\n\nYour account: {account_url}",
  },
  // The file someone asked for on a guide (M9). Factual: it's what they asked for.
  "email.guide_download": {
    subject: "{download_title}",
    body: "Here's the {download_title} you asked for: {download_url}\n\nIt came with our guide \"{guide_title}\": {guide_url}",
  },
  // ── Stage E sequences. founding_conversion, annual_offer and win_back are
  // commercial (they offer a plan), so they only go to people who agreed to
  // news for professionals, with the unsubscribe footer. quiet_rider is
  // factual: it's about their own email settings.
  "email.seq.founding_conversion.1": {
    subject: "Your free period ends on {first_charge_date}",
    body: "Hi {first_name},\n\nYour free {spotlight} period as a founding member ends on {first_charge_date}. Since it started, your profile has had {views}, {reveals} and {enquiries}.\n\nFrom {first_charge_date} you move to {listed} at {founding_price} a month, the founding rate, and it stays that price for as long as you stay. You don't need to do anything for that.\n\nIf you'd rather keep {spotlight}, it's {spotlight_price} a month. Choose here: {billing_url}",
  },
  "email.seq.founding_conversion.2": {
    subject: "{listed} or {spotlight} after {first_charge_date}",
    body: "Hi {first_name},\n\nA quick comparison before your free period ends on {first_charge_date}.\n\n{listed}, {founding_price} a month: {listed_tagline}\n{spotlight}, {spotlight_price} a month: {spotlight_tagline}\n\nYou can change plan any time afterwards, up or down: {billing_url}",
  },
  "email.seq.founding_conversion.3": {
    subject: "Before you decide to leave",
    body: "Hi {first_name},\n\nIf the numbers haven't been what you hoped, two things are worth trying before you cancel. {listed} at {founding_price} a month keeps you listed for the least it costs. Or pause for up to {pause_months} months, and your profile comes back by itself.\n\nBoth, and cancelling, are on one page: {leaving_url}",
  },
  "email.seq.annual_offer.1": {
    subject: "Pay yearly and save {saving}",
    body: "Hi {first_name},\n\nYou've been on {plan} for a few months now. Paid yearly it's {yearly} a year, which is ten months' price: {saving} less than a year of monthly payments.\n\nYou can switch from your billing page: {billing_url}",
  },
  "email.seq.annual_offer.2": {
    subject: "Yearly billing, if it suits",
    body: "Hi {first_name},\n\nOne last note about paying yearly: {yearly} a year for {plan}, instead of {monthly} a month. Nothing about your listing changes.\n\n{billing_url}",
  },
  "email.seq.win_back.1": {
    subject: "Your profile is still saved",
    body: "Hi {first_name},\n\nEverything you added to your profile is still here: the photos, the words, the reviews. It's hidden while you're not on a plan.\n\nIf you'd like it back, pick a plan and it goes live again straight away: {billing_url}",
  },
  "email.seq.win_back.2": {
    subject: "If it was the price",
    body: "Hi {first_name},\n\nIf cost was the reason you left, {listed} is {listed_price} a month and keeps your profile, enquiries and contact details working. And if you need a break later, you can pause instead of cancelling.\n\n{billing_url}",
  },
  "email.seq.win_back.3": {
    subject: "The last email about coming back",
    body: "Hi {first_name},\n\nThis is the last email we'll send about your old profile. It stays saved, so if you come back in a year it'll be where you left it: {billing_url}",
  },
  "email.seq.quiet_rider.1": {
    subject: "Do you still want our emails?",
    body: "Hi {first_name},\n\nWe haven't seen you for a while, so we're checking before we send anything else. If you'd like to keep getting your alerts and the monthly round-up, press the button here: {keep_url}\n\nIf we don't hear from you by {stop_date}, we'll stop emailing you. Your account stays, and you can switch emails back on from it any time.",
  },
  // The page behind "Cancel" on billing, and the billing page's lines about
  // pausing, cancelling and paying yearly (stage E).
  "billing.leaving": {
    title: "Before you go",
    lead: "Three choices. Cancelling is one of them, and it's one click.",
    listedTitle: "Move to {listed}",
    listedBody: "Stay listed for {listed_price} a month. Your profile, enquiries and contact details keep working.",
    pauseTitle: "Pause",
    pauseBody: "Nothing is charged and your profile is hidden. It comes back by itself when the pause ends, or sooner if you resume it.",
    pauseFreeNote: "Your free period keeps counting down while you're paused. If it ends during the pause, nothing is charged until the pause ends.",
    cancelTitle: "Cancel",
    cancelBody: "Your listing stays live until {end_date}, and nothing you've added is deleted.",
    reasonLabel: "Why are you leaving? (optional)",
    reasons: "Not enough enquiries\nToo expensive\nI'm fully booked\nI'm stopping work\nSomething else",
    pausedLine: "Paused until {date}. Your profile is hidden until then, and nothing is charged.",
    cancellingLine: "Your plan ends on {date}. Your profile stays live until then.",
    cancelledLine: "Your plan has ended. Your profile is saved and hidden; pick a plan to bring it back.",
    yearlyLine: "Pay yearly: {yearly} a year, ten months' price.",
  },
  // Competitions (M10). Confirming proves the address, so an entry only
  // counts once it's confirmed, and the news box only becomes consent then.
  "email.competition_confirm": {
    subject: "Confirm your entry: {competition}",
    body: "Thanks for entering {competition}. To confirm your entry, press the button on this page: {confirm_url}\n\nIf you didn't enter, ignore this email and your entry won't count.",
  },
  "email.competition_winner": {
    subject: "You won: {competition}",
    body: "Hi {first_name},\n\nYou've won {competition}. The prize: {prize}.\n\nReply to this email or write to us at {contact_email} within 14 days so we can arrange it. The result is on the competition page: {competition_url}",
  },
  // The last line of every sequence email.
  "email.sequence_footer": {
    body: "Don't want these emails? One click stops them: {stop_url}",
  },
  // "Did you end up booking?", a set number of days after an enquiry (M5). Factual: about their own enquiry, promotes nothing.
  "email.enquiry_followup": {
    subject: "Did you end up booking {name}?",
    body: "Hi {rider_first},\n\nOn {enquiry_date} you sent {name} an enquiry through Equine Professionals Australia. Did you end up booking them? One tap tells us: {answer_url}\n\nIf you did, you can leave a short review on the same page. We'll only ask once.",
  },
  // To someone who wrote a review from a professional's link: proves the address is theirs.
  "email.review_confirm": {
    subject: "Confirm your review of {name}",
    body: "Thanks for reviewing {name}. To post it, confirm this is your email address: {confirm_url}\n\nIf you didn't write a review, ignore this email and nothing will be posted.",
  },
  // To the professional when a review of them goes up.
  "email.review_published": {
    subject: "New review on your profile",
    body: "Hi {first_name},\n\n{author} reviewed you: {rating} out of 5.\n\n\"{review}\"\n\nYou can post one public reply under it from your dashboard: {reviews_url}\n\nWe don't take reviews down on request. If you think this one breaks our review policy, the policy says how to report it: {policy_url}",
  },
  // Once, to everyone who asked to hear when the site opened (The Marketing Engine §09).
  "email.launch": {
    subject: "Equine Professionals Australia is open",
    body: "You asked us to tell you when the site opened. It's open.\n\nFind a coach: {coaches_url}\nFind a farrier, vet, physio or anyone else your horse needs: {horse_care_url}\n\nSearch near where your horse lives and you can ask us, with the results, to email you when someone new starts nearby: {search_url}\n\nIt's free for riders and horse owners, and it always will be.",
  },
  "email.renewal_reminder": {
    subject: "Your {plan} plan renews on {renewal_date}",
    body: "Hi {first_name},\n\nYour yearly {plan} plan renews on {renewal_date}, for {price}, charged to the card you have with us.\n\nTo change plan or cancel before then: {billing_url}",
  },
  // A thin line across the top of every page (The Marketing Engine M3).
  // Empty message: no bar. Dates are YYYY-MM-DD; empty means no limit.
  // audience: everyone, logged_out, riders, coaches or horse_care.
  "site.announcement": {
    message: "",
    linkLabel: "",
    linkHref: "",
    starts: "",
    ends: "",
    audience: "everyone",
  },
  // The gentle slide-in offering alerts, when it's switched on in Settings.
  "site.slide_in": {
    title: "Hear when someone good starts near you",
    body: "Tell us where your horse lives and we'll email you when a coach, farrier or other professional joins nearby. Nothing else.",
  },
  // /competitions and each competition's page (M10).
  "competitions.words": {
    indexTitle: "Competitions",
    indexIntro: "Free to enter, judged on what you write, with the full terms on each one.",
    none: "Nothing's running at the moment.",
    enterHeading: "Enter",
    ageLabel: "I'm 18 or over",
    parentLabel: "I'm a parent or guardian entering for my child",
    sent: "Nearly done. We've emailed you a link: press it to confirm your entry.",
    confirmed: "You're in. We'll announce the result by {winners_by}.",
    notYet: "Entries open on {opens}.",
    closed: "Entries have closed.",
    winnersHeading: "Winners",
    termsHeading: "Full terms",
  },
  // The terms every competition publishes, filled from its fields. Square
  // brackets are for the solicitor. {judging} is the skill or draw sentence.
  "competitions.terms": {
    sections: [
      { title: "The promoter", body: "Equine Professionals Australia, ABN {abn}. Contact: {contact_email}." },
      { title: "Who can enter", body: "{who_can_enter} Entrants must be 18 or over, or entered by a parent or guardian. People who run Equine Professionals Australia and their families can't enter." },
      { title: "When", body: "Entries open {opens} and close {closes}, Melbourne time. Entries after the close aren't counted." },
      { title: "How to enter", body: "Answer the question on the competition page and confirm your email address with the link we send. It's free, and one entry per person." },
      { title: "How the winner is chosen", body: "{judging}" },
      { title: "The prize", body: "{prize}, worth {prize_value} in total. {winner_count_text} The prize can't be exchanged for cash." },
      { title: "The result", body: "Winners are chosen by {winners_by}. {how_winners_told} The winner's first name, the first letter of their surname and their state are published on this page." },
      { title: "Your details", body: "We use your name, email address, state, answer and any photo you send to run the competition, judge it, contact the winner and show we ran it fairly. We keep them for 12 months after the result, then delete them. The winner's first name, surname initial and state are published on this page. Entering doesn't sign you up for any emails; the separate box on the form does, if you tick it. Our privacy policy at /privacy covers the rest." },
      { title: "The fine print", body: "Our decision on the result is final, and we'll explain how it was reached if asked. If a prize isn't available we'll substitute one of equal value. We can cancel or change the competition if something outside our control makes it impossible to run as described, and we'll say so on this page. These terms are governed by the law of Victoria. [Solicitor: this is a game of skill with no entry fee, so no permit applies in any state; the code refuses a random draw over $3,000 so an ACT permit is never needed. Confirm.]" },
    ] as Items,
  },
  // /riders-choice: the published rules for the award (stage F).
  "riders_choice.rules": {
    title: "Riders' choice",
    intro: "Once a year, for each profession in each state, the professional riders and horse owners rated highest.",
    sections: [
      { title: "Who can win", body: "Anyone listed on the site at the end of the year, with at least {min_reviews} reviews published during that year." },
      { title: "How it's worked out", body: "The highest average rating from reviews published during the year wins. If two are level, the one with more reviews wins; if still level, the one more riders and horse owners saved to their accounts that year." },
      { title: "What doesn't count", body: "Which plan someone is on, anything they've paid us, and testimonials they added themselves. Reviews come in only under our review policy, and we publish the bad ones too." },
      { title: "Nobody picks the winners", body: "The numbers do. We check the result before it's published, and we'd only change it if a review turned out to break the review policy." },
    ] as Items,
  },
  // /guides and each guide's page (M9). {plural} is a profession's plural, like "farriers".
  "guides.words": {
    indexTitle: "Guides",
    indexIntro: "Practical reading for riders and horse owners, written with the professionals who do the work.",
    related: "Find {plural} near you",
    relatedAny: "Find someone near you",
    downloadHeading: "Get the {download_title} by email",
    downloadLead: "We'll send you a link to the file straight away.",
    downloadSent: "Sent. Look in your inbox for the {download_title}.",
    coauthor: "Written with {name}",
  },
  // The review form, the confirm page and the "did you book?" page (M5).
  // {name} is the professional; {audience_plural} is "riders" or "horse owners".
  "reviews.words": {
    heading: "How was your experience with {name}?",
    intro: "Tell other {audience_plural} what it was like. Your review goes on {name}'s profile with your first name and the first letter of your surname. We never show your email address.",
    declaration: "I've used {name}'s services. I'm not {name}, and I'm not related to them, working for them or competing with them. Nobody offered me anything for writing this.",
    sent: "Nearly done. We've emailed you a link: press it and your review is posted.",
    confirmedLive: "Thanks. Your review is on {name}'s profile now.",
    confirmedHeld: "Thanks. Your review will show on {name}'s profile once we've read it.",
    question: "Did you end up booking {name}?",
    yes: "Yes, I booked",
    no: "No",
    talking: "Still sorting it out",
    thanksNo: "Thanks for letting us know. That helps {name} see how their enquiries go.",
    thanksTalking: "Thanks. Good luck with it.",
  },
  // /review-policy, linked from every review (The Marketing Engine §05.7, the ACCC's guidance for review platforms).
  review_policy: {
    title: "Our review policy",
    intro: "How reviews get onto profiles, what we take down, and what we never take down.",
    sections: [
      { title: "Who can write one", body: "Anyone who has used the professional. There are two ways in: a link the professional sends to their clients, or our email a few weeks after you enquire through the site. You confirm your email address before a review goes up, and each person can review a professional once." },
      { title: "We publish the bad ones too", body: "Every genuine review goes up, whatever the rating. A professional can't have a review removed because they don't like it, and paying us changes nothing: not which reviews show, not their order, not the average. Which plan they're on makes no difference." },
      { title: "What we take down", body: "A review comes down only if it's fake, written by someone with a conflict of interest (the professional, their family, their staff or a competitor), abusive, defamatory, off topic, or shares someone's personal details. We log every decision with its reason. Nothing else is a reason." },
      { title: "Nobody edits a review", body: "We don't change the words in a review, and neither can the professional. They can post one public reply under it." },
      { title: "How we check", body: "We look for the same person reviewing twice, several reviews from one device, and text copied from another review. A review that trips one of these waits for a person to read it before it shows." },
      { title: "The label on a review", body: "\"Enquired through Equine Professionals Australia\" means the reviewer sent an enquiry through the site and later told us they booked. It doesn't mean we saw the lesson or visit happen. We never label a review as verified." },
      { title: "Testimonials are different", body: "Some profiles also show quotes the professional added themselves. Those are marked \"Provided by the business\" and don't count toward the rating." },
      { title: "Nothing in return", body: "We don't offer anything for writing a review, and professionals mustn't either. If you think a review was written in return for something, report it." },
      { title: "Report a review", body: "Every review has a \"Report this review\" link. Tell us which of the rules above you think it breaks. We read every report and log what we decided." },
      { title: "If a review is about you and you think it's defamatory or false", body: "Press \"Report\" on the review, or email {contact_email} with the link to the review and what you say is wrong in it. Tell us which parts are untrue and why. We'll acknowledge it within two business days and give you a reasonable response within seven days of receiving enough detail to act on: we'll take it down, hold it while we ask the reviewer to confirm what they wrote, or tell you why it stays and that you can reply publicly under it. We don't take down a review just because it's negative, and we don't edit anyone's words. Reviewers are told when a review they wrote is reported, and we keep a record of every report and what we did." },
      { title: "Incentives, relationships and disclosure", body: "Nobody is paid or rewarded for a review, by us or by the professional, and a professional who offers anything for a review loses their listing. A reviewer's relationship to a professional (family, employee, business partner, competitor) has to be declared, and a review with an undeclared one comes down. Paying us for a plan changes nothing about reviews: not which show, not their order, not the average. Every rating shows how many reviews it's made from." },
    ] as Items,
  },
  // /how-we-list, linked from every results list (The Marketing Engine §05.8).
  "how_we_list": {
    title: "How the list is ordered",
    intro: "What decides where someone appears when you search, and what doesn't.",
    sections: [
      { title: "Nearest first", body: "When you search near a place, people based closest to it come first. Someone based further away who travels to your area comes after the people based in it, and their card says they travel to you." },
      { title: "Then by how well they match", body: "If you pick disciplines, specialities or setup, people who match more of what you picked come before people who match less, at the same distance." },
      { title: "Featured spots are labelled", body: "Some plans include a turn in a featured spot. Featured people sit in their own labelled block above the list, never inside it, take turns day to day, and don't show at all in areas with only a few professionals. Paying never moves anyone up or down the list itself." },
      { title: "What never changes the order", body: "Which plan someone is on, how long they've been listed, and anything they pay us. We don't take a commission on lessons or visits, so we have no reason to push anyone." },
      { title: "Who's on the list", body: "Everyone listed signed up themselves and finished their profile, and we looked at it before it went live. We don't check qualifications or registration unless a profile says so, and we don't recommend anyone." },
    ] as Items,
  },
  // ── Legal ───────────────────────────────────────────────────────────────
  // /terms, /privacy, /cookies and /refunds, from the "Legal pages" draft 2
  // (12 Oct 2026), solicitor-ready but not yet checked. Square brackets are
  // notes for the solicitor. The pages say "draft" and stay noindex until
  // the legal_approved setting is on. Variables: {abn}, {contact_email},
  // {founding_price}, {free_months} ("six"), {enquiry_months},
  // {pause_max_months}. A blank line in a body starts a new paragraph; a
  // paragraph whose lines all start with "- " is a bullet list; the site's
  // own paths (/refunds, /privacy...) and oaic.gov.au become links.
  // The short line beside each form that collects details (APP 5: who's
  // collecting, why, who it goes to, where the policy is). [label](/path) is
  // a link. {name}: the professional, on the enquiry form.
  "legal.notices": {
    enquiry: "Your name, contact details, suburb and message go to {name} so they can reply, and we keep a copy. We'll email you once in a few weeks to ask how it went. [Privacy policy](/privacy).",
    riderSignup: "By creating an account you agree to our [terms](/terms). We keep your name and email to run your account. [Privacy policy](/privacy).",
    providerSignup: "By creating an account you agree to our [terms](/terms). We keep your details to run your listing and your billing, and show on your profile only what you switch on. [Privacy policy](/privacy). [Cancelling and refunds](/refunds).",
    review: "We publish your first name, surname initial, rating and words. We keep your email to confirm the review and stop duplicates; it's never shown. [Review policy](/review-policy). [Privacy policy](/privacy).",
    competition: "We use these details to run the competition and contact the winner, and delete them 12 months after the result. [Competition terms](#terms).",
    guide: "We'll email you the link now. [Privacy policy](/privacy).",
    pricing: "Charged in advance, monthly or yearly, and renews until you cancel. Cancel in two clicks from your dashboard. [Refunds](/refunds).",
  },
  "legal.terms": {
    title: "Terms of service",
    updated: "Updated 12 October 2026",
    intro: "These terms cover everyone who uses Equine Professionals Australia: riders and horse owners looking for help, and the coaches and horse care professionals who list here. By using the site, or by making an account, you agree to them. If you list with us, the sections headed \"If you list with us\" and \"Plans, payment and cancelling\" are the contract for your listing.",
    sections: [
      { title: "Who we are", body: "Equine Professionals Australia is a partnership between Alana La Bouchardiere and Kim Thompson, trading as Equine Professionals Australia, ABN {abn}, based in Victoria. When these terms say \"we\" or \"us\", that's who they mean. You can reach us at {contact_email}. We answer email within two business days." },
      { title: "What the site is", body: "A directory. Riders and horse owners search it for free. Coaches, farriers, vets, dentists, bodyworkers and other horse care professionals pay a monthly or yearly fee to have a profile on it.\n\nWe don't book lessons or visits, take payment for them, or take a cut of what you pay a professional. We don't employ, represent or act for anyone listed here." },
      { title: "Who can use it", body: "You can search without an account. To make an account, send an enquiry, write a review or enter a competition you need to be 18 or over, or have a parent or guardian do it for you. A parent can enquire about lessons for a child under 18; please don't put a child's own contact details into a form." },
      { title: "We don't vet anyone", body: "Every profile is written by the person it's about. We don't check qualifications, registration numbers, insurance, working with children checks, facilities or the quality of anyone's work, and we don't accredit, endorse or recommend anyone. Anything a profile says about those things is shown as the professional supplied it.\n\nIf a professional needs to be registered to do their work (vets and some other health professionals do), check their registration with the board that keeps it. If they'll be working with a child, ask to see their working with children check. Ask a professional the questions you'd ask anyone new before they work with you or your horse." },
      { title: "Dealing with a professional", body: "When you contact someone through the site, anything you arrange is between you and them. We're not a party to that arrangement, and we aren't responsible for the lessons, visits, treatment, advice, safety or conduct of anyone listed here. Riding and handling horses carries risk; that's between you, the professional and your own insurance.\n\nIf something goes wrong, take it up with them. We'd also like to hear about it at {contact_email}, because a profile that misleads people shouldn't stay up." },
      { title: "If you list with us", body: "Your profile has to be about you, true, and kept up to date. You can only list a profession you actually work in. Only add photos, video and testimonials you have the right to use, and only name qualifications you hold. A testimonial has to come from a real client who agreed to it being shown.\n\nYou're responsible for holding any registration, licence, insurance or check the law requires for your work, and for everything your profile claims. If a regulator restricts what your profession can call itself or advertise, that applies to your profile too.\n\nThe details in an enquiry are for replying to that person. Don't add them to a mailing list, sell them or pass them on, and delete them when you no longer need them.\n\nIf you share one account with other people (a riding school, a practice), you're responsible for what they do with it. Each profile is for one person; a business with several professionals lists each of them, or talks to us first." },
      { title: "Reviews, testimonials and your conduct", body: "Reviews on the site are written by riders and horse owners and covered by our review policy at /review-policy. You can reply to a review and report one, but you can't have a genuine review removed because you don't like it. Don't write, buy, trade or solicit fake reviews, review yourself, or offer anything for a positive review. Doing any of those ends your listing.\n\nDon't use the site to harass, threaten or defame anyone, or to collect people's details." },
      { title: "Review, changes and removal of listings", body: "We look at every new profile before it goes live, and we can ask for changes first. We can hide or remove a profile, an event, a photo or a testimonial that breaks these terms, misleads people, is unlawful or puts anyone at risk. We'll tell you why when we do, and give you a chance to fix it unless the problem is serious or you've been told before. If we end a paid listing for one of those reasons, we don't refund the current period. If we end it for any other reason, we refund the unused part." },
      { title: "Plans, payment and cancelling", body: "Plans and prices are on our pricing page, in Australian dollars, GST not applicable while we're not registered for GST. They're charged in advance, monthly or yearly, through Stripe, and they renew automatically until you cancel. We never see your full card number.\n\nBefore you subscribe we show you the price, how often it's charged, when the first charge happens, and how to cancel. You can change plan, pause, or cancel any time from your dashboard, in as many steps as it took to sign up. Cancelling stops the next renewal; your profile stays live until the end of the period you've paid for. We don't refund part of a month or year you've already paid for, except where the law says we must or we've got something wrong. The detail is on our cancelling and refunds page at /refunds.\n\nIf a payment fails, Stripe retries it and emails you. If it still fails, your profile is hidden until the card is fixed, and comes back when it is.\n\nFounding members: you pay nothing until {free_months} months after the site opens to riders. We'll email the exact date when it's set, and again 30, 14 and 3 days before your first charge. From then your plan costs {founding_price} a month for as long as you stay listed, even if the public price goes up." },
      { title: "Changing prices or what a plan includes", body: "We can change prices and what each plan includes. A price change only applies to you from your next renewal, and we'll email you at least 30 days before it. If we remove something from your plan that you're paying for, you can cancel before the change and we'll refund the unused part of your current period." },
      { title: "What you add to the site", body: "What you put on your profile stays yours. While it's listed, you let us show it on the site, in our emails, in share images and in search engine results, and resize or crop your photos to fit. That permission ends when your profile comes down, except for copies in emails already sent and in backups, which clear in their normal cycle.\n\nEverything else on the site (the design, the words we wrote, the area and discipline pages, the data behind search) is ours. You can link to any page. You can't copy the site or its listings in bulk." },
      { title: "Using the site fairly", body: "Don't copy profiles or contact details off the site in bulk, send spam or sales pitches through the enquiry form, pretend to be someone else, use automated tools to scrape or load the site, or try to get into parts of the site that aren't yours. Click-to-reveal contact details are for riders and horse owners who want to book, not for marketing." },
      { title: "Our responsibility to you", body: "Nothing in these terms removes any right you have under the Australian Consumer Law, including the consumer guarantees. Where the law lets us limit our liability for a service, we limit it to supplying the service again, or paying the cost of having it supplied again.\n\nBeyond that, and as far as the law allows, we aren't liable for the work, advice or conduct of the professionals listed here, for loss that comes from relying on what a profile or review says, for the site being unavailable, or for indirect loss such as lost business. Where we are liable to a professional for anything to do with their listing, our total liability is limited to the fees they paid us in the 12 months before the claim. [Solicitor: confirm the cap and the carve-outs; nothing limits liability for our own fraud, negligence causing death or injury, or anything the ACL won't let us limit.]\n\nYou agree to cover us for claims that come from what you put on your profile or do through the site, to the extent you caused them." },
      { title: "Ending an account", body: "You can close an account at any time from your account page or by emailing {contact_email}. Closing it ends any listing at the end of its paid period. We can close an account that breaks these terms, as described under \"Review, changes and removal\"." },
      { title: "Complaints and disputes", body: "Email {contact_email} first and give us 14 days to sort it out. If we can't, either of us can go to a court in Victoria. Consumers can also contact Consumer Affairs Victoria or the equivalent body in their state. If you think something on the site is defamatory or breaches your privacy, our review policy explains how to report it and what we do within seven days." },
      { title: "Changes to these terms", body: "If we change these terms, we'll put the new version here with its date. If a change affects what you pay, what your plan includes, or your rights, we'll email you at least 30 days before it applies, and you can cancel before then." },
      { title: "The law that applies", body: "These terms are governed by the law of Victoria, Australia, and the courts of Victoria. Nothing in them takes away protections you have under the law of the state you live in." },
    ] as Items,
  },
  "legal.privacy": {
    title: "Privacy policy",
    updated: "Updated 12 October 2026",
    intro: "What we collect, why, where it's kept, who else handles it, and what you can ask us to do with it. We follow the Australian Privacy Principles in the Privacy Act 1988, whether or not the law requires a business our size to. We don't sell or rent anyone's details, and we don't show anyone ads based on who they are.",
    sections: [
      { title: "Who this covers", body: "Equine Professionals Australia (Alana La Bouchardiere and Kim Thompson in partnership, ABN {abn}). Privacy questions and requests go to {contact_email}." },
      { title: "If you're looking for help", body: "To search, you don't need an account and we don't ask who you are. If you press \"Use my location\", your browser asks your permission, we turn the coordinates into the nearest suburb to run the search, and we don't keep the coordinates.\n\nIf you make an account we keep your name, email address, the professionals you save, and any alerts you set up: the suburb or postcode, how far to look, and what you follow.\n\nWhen you send an enquiry, your name, how to contact you (email, and phone if you give it), your suburb and your message go to that professional, and we keep a copy so you can both see where it's up to. A few weeks later we may email you once to ask whether you booked and whether you'd like to leave a review.\n\nIf you leave a review, we publish your first name, the first letter of your surname, your rating, your words and the date. We keep your email address and a scrambled code for your device so one person can't review the same professional twice; neither is ever shown.\n\nIf you enter a competition, we keep your name, email address, state, your answer and any photo you send, for the length of the competition and 12 months after, so we can run it and show we ran it fairly. A winner's first name, surname initial and state are published.\n\nIf you download a guide, join the waitlist or sign up to alerts, we keep your email address and a record of what you agreed to." },
      { title: "If you list with us", body: "We keep what you put on your profile: your name, business name, where you're based and how far you travel, what you do, qualifications, registration numbers and insurance details you choose to add, photos, video, testimonials and events. Your email address and phone number are only shown to visitors if you switch them on, and even then behind a click, not printed on the page.\n\nWe also keep your account email, your plan and its payment history, the enquiries sent to you, the reviews about you and your replies, referral codes you've shared, and which pages of the site your profile appeared on. Stripe handles your card and your billing details; we see what was charged, never the card number." },
      { title: "What we count, and why", body: "We count how often each profile appears in search, is opened, has a number revealed and gets an enquiry, so professionals can see their numbers and so we can tell them honestly whether the site is working. To count each visitor once a day we make a scrambled code from the visitor's connection details and a daily key; we don't store the connection details, and the code can't be reversed. We don't count a professional looking at their own profile, or us.\n\nWe record what people search for and how many results they got, without who searched, so we can see what the site is missing.\n\nWe use Google Search Console to see which searches bring people to the site. That's about pages, not people, and Google doesn't give us anyone's identity." },
      { title: "Cookies and your browser", body: "The site uses three cookies and nothing else. One keeps you signed in. Two remember which link brought you here (a poster, a partner, a post) for 90 days, so we can tell which ways of reaching people work. Your browser also keeps a few preferences of its own, like whether you hid the map. We don't use advertising cookies, analytics trackers, tracking pixels or any other company's trackers, and we don't need a cookie banner because nothing here tracks you. The full list is at /cookies." },
      { title: "Emails and texts", body: "We only send marketing, including alerts, round-ups, invitations and news, to people who agreed to it, and we keep a record of each agreement: what you agreed to, the exact words you saw, where and when. Every marketing email says who sent it and has a link to change what you get or stop everything, which works for at least 30 days and takes effect within five business days (usually straight away). Emails about your own account, like an enquiry sent to you, a review about you, a receipt or a password reset, keep coming while the account is open. If an email to you bounces or is marked as spam, we stop emailing that address.\n\nIf we offer text message alerts, they'll be opt-in, from a sender name registered with the ACMA, and you'll be able to stop them by replying STOP." },
      { title: "Sponsors and referrals", body: "Some pages and emails carry a slot labelled \"Sponsored\". Every visitor sees the same slot; nothing about you is used to choose it, and sponsors never see who you are. If you use a referral link, we record that the person who signed up came from it so the referrer gets their reward, and nothing else about either of you is shared." },
      { title: "Decisions made automatically", body: "Some things the site decides on its own. Search results are ordered by distance and by how well someone matches what you searched for; how that works is on our \"How the list is ordered\" page at /how-we-list. A professional's profile is hidden automatically when their payment fails and comes back when it's paid. A review is held for a person to read if it looks like a duplicate or came from the same device as another review of the same professional. A person looks at every new profile before it goes live, and a person makes every decision to remove a profile or a review. No decision about you is made from your personal details beyond where you are and what you searched for." },
      { title: "Who helps us run the site, and where your details go", body: "The details above are stored with Supabase, whose servers for us are in Sydney, Australia. The site is hosted by Vercel, which runs it from servers in the United States and at network points around the world. Payments go through Stripe, in the United States. Email is sent through Resend, from servers in Japan. Maps come from OpenFreeMap, which sees the map area you look at but not who you are. Intro videos on some profiles come from YouTube or Vimeo, and load only when you press play. Search data comes from Google Search Console.\n\nThese companies handle your details only to provide their service to us, under contracts that stop them using it for anything else. Some of them hold it outside Australia, which means it's covered by the law of the country it's in. We take reasonable steps to make sure each of them protects it the way the Australian Privacy Principles require. Beyond those companies, we only disclose your details to a professional you contact, to a rider you reply to, or where the law requires it." },
      { title: "How we protect it", body: "Everything travels over HTTPS. The database is only reachable by our own server code, with a separate key for each kind of access, and each person's data is locked to their own account by rules in the database itself. Card numbers never touch our systems. Both of us use two-factor sign-in on every service that holds your details. If we ever have a breach that's likely to cause you serious harm, we'll tell you and the Office of the Australian Information Commissioner as soon as we can." },
      { title: "How long we keep it", body: "For as long as your account is open. When an account is closed, its profile, alerts, saved professionals and enquiries go with it within 30 days. An enquiry's name, contact details and message are deleted {enquiry_months} months after it was sent, whether or not the accounts are still open; the professional's count of enquiries stays. Reviews stay published after the reviewer's account closes, because they're about the professional, unless you ask us to remove yours. We keep billing records for five years, as tax law requires, and consent records for as long as we might need to show what you agreed to. Backups clear within 30 days." },
      { title: "Seeing, changing or deleting your details", body: "You can change most of your details yourself from your account or dashboard. To see everything we hold about you, correct it, or have it deleted, email {contact_email}. We'll confirm who you are, then reply within 30 days. We'll delete everything we can; a few things have to stay (billing records, and anything we need for a dispute that's already started), and we'll tell you what and why." },
      { title: "Children", body: "The site is for adults. We don't knowingly collect details from anyone under 18, and a parent who enquires about lessons for a child gives us their own details, not the child's. If you think a child has given us their details, email {contact_email} and we'll delete them." },
      { title: "Complaints", body: "If you're unhappy with how we've handled your details, email {contact_email} and we'll reply within 14 days and try to fix it. If we can't, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au or 1300 363 992." },
      { title: "Changes to this policy", body: "When we change it, the new version goes here with its date. If the change matters, we'll email account holders." },
    ] as Items,
  },
  "legal.cookies": {
    title: "Cookies and what the site stores on your device",
    updated: "Updated 12 October 2026",
    intro: "The whole list. There's no banner because there's nothing to agree to: the site doesn't track you, and none of these go to anyone but us.",
    sections: [
      { title: "Cookies we set", body: "Signed in: a cookie from our sign-in service (named sb-...) that keeps you logged in. Set when you log in, gone when you log out or after a week of not visiting. Without it you can't stay signed in.\n\nWhere you came from: epa_ft and epa_lt. If you arrive through one of our links, from a poster's QR code, a partner's page or a post, they remember which one for 90 days: the first one ever and the latest one. They hold the link's name, not anything about you. We use them to see which ways of reaching people work. If you then make an account or sign up to alerts, we copy that link name onto your record.\n\nTest site only: a password cookie on our test address, which the public site never sets." },
      { title: "What your browser keeps for us", body: "A few preferences that stay on your device and never leave it: whether you hid the map on search results, whether you've already seen or closed our sign-up prompt and announcement bar, and whether you've signed up to alerts on this device (so we stop asking). Clear your browser's site data to remove them." },
      { title: "Videos on profiles", body: "Some professionals have an intro video on YouTube or Vimeo. Nothing loads from either service until you press play, apart from YouTube's still picture, which sets no cookies. When you press play, the video comes from that service and its own cookie rules apply; we use YouTube's privacy-enhanced player and Vimeo's do-not-track setting to keep that to a minimum." },
      { title: "What we don't use", body: "No analytics service. No advertising cookies. No tracking pixels in the site or in our emails. No social media buttons that report back. No other company's cookies, apart from a video you choose to play. If that changes, this page changes first." },
      { title: "Turning cookies off", body: "You can block cookies in your browser. The site still works for searching; you won't be able to stay signed in." },
    ] as Items,
  },
  "legal.refunds": {
    title: "Cancelling, changing and refunds",
    updated: "Updated 12 October 2026",
    intro: "For professionals with a paid listing. Riders and horse owners never pay us anything.",
    sections: [
      { title: "How billing works", body: "Your plan is charged in advance, monthly or yearly, to the card you gave Stripe, and renews automatically until you cancel. The price you see on the pricing page is the whole price; there's no GST while we're not registered, and no setup or cancellation fee. You get a receipt from Stripe for every charge." },
      { title: "Cancelling", body: "Dashboard, Billing, Cancel. Two clicks, no email to us, no phone call. Cancelling stops the next renewal. Your profile stays live until the end of the period you've already paid for, then comes down. You can undo a cancellation any time before that date." },
      { title: "Changing plan", body: "Up: the change happens now, you pay the difference for the rest of the period, and the new features switch on straight away. Down: the change happens at the end of the current period, you keep what you paid for until then, and nothing is deleted. Extra photos, your second location or past events go dormant and come back if you upgrade again.\n\nGoing up for one month and back down the next is fine. That's what the Clinic plan is for." },
      { title: "Pausing", body: "You can pause your listing for up to {pause_max_months} months from the dashboard. Nothing is charged while it's paused and your profile is hidden; your numbers, reviews and photos wait for you." },
      { title: "Refunds", body: "We don't refund part of a month or year you've already started, because your profile has been live for it. We do refund in full, to the card you paid with, within ten business days, if:\n\n- we charged you by mistake, or charged the wrong amount;\n- we remove something from your plan mid-period and you cancel because of it (the unused part);\n- we end your listing for a reason that isn't a breach of the terms (the unused part);\n- the site was down for more than seven days in a row during a period you paid for (that period);\n- the law says we have to.\n\nTo ask, email {contact_email} with the receipt. If you dispute a charge with your bank instead, tell us too, so we can sort it out faster." },
      { title: "Founding members", body: "You pay nothing until {free_months} months after the site opens to riders. We email you the date when it's set, then 30, 14 and 3 days before the first charge. Cancel any time before it and you're never charged. After it, the rules above apply, at {founding_price} a month for as long as you stay." },
      { title: "If a payment fails", body: "Stripe tries again over the next few days and emails you. If it still fails, your profile is hidden until you update the card from your dashboard, then it comes straight back. Nothing is deleted." },
    ] as Items,
  },
};

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
export type ContentValue<K extends ContentKey> = (typeof CONTENT_DEFAULTS)[K];
