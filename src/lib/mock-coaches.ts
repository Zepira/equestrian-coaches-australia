// Mock coach data for populating search/discipline/home pages during
// design & QA review — deliberately kept OUT of Supabase so it's trivial
// to remove: set MOCK_COACHES_ENABLED to false, or delete this file and
// the four small merge blocks that import from it (search each for
// "mock-coaches" to find them all: src/app/page.tsx, src/app/search/
// page.tsx, src/app/disciplines/[slug]/page.tsx,
// src/app/coaches/[slug]/page.tsx). Nothing here ever touches the DB.
import { getDisciplineBySlug } from "@/lib/disciplines";
import { slugify } from "@/lib/slugify";

export const MOCK_COACHES_ENABLED = true;

type Town = { suburb: string; state: string; lat: number; long: number };

const TOWNS: Town[] = [
  { suburb: "Bendigo", state: "VIC", lat: -36.7642, long: 144.2786 },
  { suburb: "Ballarat", state: "VIC", lat: -37.5622, long: 143.8503 },
  { suburb: "Geelong", state: "VIC", lat: -38.1499, long: 144.3617 },
  { suburb: "Shepparton", state: "VIC", lat: -36.3805, long: 145.399 },
  { suburb: "Warrnambool", state: "VIC", lat: -38.3818, long: 142.4874 },
  { suburb: "Toowoomba", state: "QLD", lat: -27.5606, long: 151.9539 },
  { suburb: "Cairns", state: "QLD", lat: -16.9203, long: 145.771 },
  { suburb: "Rockhampton", state: "QLD", lat: -23.3791, long: 150.51 },
  { suburb: "Gympie", state: "QLD", lat: -26.1899, long: 152.665 },
  { suburb: "Tamworth", state: "NSW", lat: -31.0927, long: 150.9294 },
  { suburb: "Orange", state: "NSW", lat: -33.2839, long: 149.1 },
  { suburb: "Wagga Wagga", state: "NSW", lat: -35.1082, long: 147.3598 },
  { suburb: "Dubbo", state: "NSW", lat: -32.2569, long: 148.6011 },
  { suburb: "Armidale", state: "NSW", lat: -30.5, long: 151.6667 },
  { suburb: "Mount Barker", state: "SA", lat: -35.0667, long: 138.85 },
  { suburb: "Mount Gambier", state: "SA", lat: -37.8284, long: 140.7828 },
  { suburb: "Bunbury", state: "WA", lat: -33.3271, long: 115.6414 },
  { suburb: "Albany", state: "WA", lat: -35.0269, long: 117.8837 },
  { suburb: "Kalgoorlie", state: "WA", lat: -30.7489, long: 121.4658 },
  { suburb: "Launceston", state: "TAS", lat: -41.4332, long: 147.1441 },
  { suburb: "Hobart", state: "TAS", lat: -42.8821, long: 147.3272 },
  { suburb: "Darwin", state: "NT", lat: -12.4634, long: 130.8456 },
  { suburb: "Alice Springs", state: "NT", lat: -23.698, long: 133.8807 },
  { suburb: "Canberra", state: "ACT", lat: -35.2809, long: 149.13 },
];

const FIRST_NAMES = [
  "Emma", "Olivia", "Charlotte", "Sophie", "Isabella", "Amelia", "Grace", "Chloe",
  "Ella", "Mia", "Ava", "Zoe", "Ruby", "Lily", "Hannah", "Jack", "Oliver", "William",
  "Thomas", "Lucas", "Henry", "Ethan", "Noah", "Cooper", "James",
];
const LAST_NAMES = [
  "Anderson", "Baker", "Campbell", "Dawson", "Edwards", "Fletcher", "Gordon", "Harris",
  "Ingram", "Jenkins", "Kelly", "Lawson", "Mitchell", "Nolan", "O'Brien", "Parker",
  "Quinn", "Reynolds", "Stewart", "Turner", "Underwood", "Vance", "Walsh", "Young", "Zimmerman",
];

const DISCIPLINE_SLUGS = [
  "bridleless", "working-equitation", "liberty", "western", "dressage", "show-jumping",
  "eventing", "campdrafting", "natural-horsemanship", "pony-club", "para-equestrian",
];

const QUALIFICATIONS_BY_DISCIPLINE: Record<string, string[]> = {
  bridleless: ["Certified Natural Horsemanship Instructor"],
  "working-equitation": ["Working Equitation Australia accredited"],
  liberty: ["Certified Liberty & Connection Coach"],
  western: ["Western Dressage Australia accredited"],
  dressage: ["EA Level 1 Coach", "EA Level 2 Coach"],
  "show-jumping": ["EA Level 1 Coach (Jumping)"],
  eventing: ["EA Level 2 Coach (Eventing)"],
  campdrafting: ["Australian Campdraft Association accredited"],
  "natural-horsemanship": ["Certified Natural Horsemanship Instructor"],
  "pony-club": ["Pony Club Australia accredited coach"],
  "para-equestrian": ["Para-Equestrian Australia accredited coach"],
};

// Skills a coach in this discipline is plausibly offering — mirrors the
// curated discipline→skill term_suggestions in
// supabase/migrations/0008_taxonomy_seed_and_migrate.sql, so mock coaches
// show the same real vocabulary a rider filtering by skill would see (not
// a second, drifting set of made-up skill names).
const SKILLS_BY_DISCIPLINE: Record<string, string[]> = {
  dressage: ["lateral-work", "dressage-test-riding", "confidence-building", "competition-preparation"],
  "show-jumping": ["jumping-technique", "confidence-building", "competition-preparation", "first-show-preparation"],
  eventing: ["cross-country-schooling", "jumping-technique", "dressage-test-riding", "competition-preparation"],
  western: ["stock-work", "starting-young-horses", "groundwork-handling", "confidence-building"],
  campdrafting: ["stock-work", "starting-young-horses", "competition-preparation", "confidence-building"],
  liberty: ["groundwork-handling", "confidence-building", "trick-training", "problem-behaviour"],
  bridleless: ["groundwork-handling", "confidence-building", "trick-training"],
  "natural-horsemanship": ["groundwork-handling", "starting-young-horses", "problem-behaviour", "spooking-napping"],
  "pony-club": ["adult-beginners", "confidence-building", "first-show-preparation", "returning-to-riding"],
  "para-equestrian": ["confidence-building", "returning-after-fall", "rider-biomechanics"],
  "working-equitation": ["lateral-work", "stock-work", "competition-preparation", "confidence-building"],
};

// Setup/attribute names, keyed by slug, purely for display — the same
// slugs the real terms table seeds in 0008. Exported so the coach detail
// page can render a mock coach's skills/attributes without a second name
// lookup table.
export const ATTRIBUTE_NAMES: Record<string, string> = {
  "horses-available": "Horses available for lessons",
  "own-arena": "Own arena",
  "indoor-arena": "Indoor arena",
  "xc-course-on-site": "Cross-country course on site",
  "agistment-available": "Agistment available",
  "beginners-welcome": "Beginners welcome",
  "children-juniors": "Children & juniors",
  "adults-only": "Adults only",
  "nervous-riders": "Nervous riders",
  "ndis-registered": "NDIS registered",
  "group-lessons": "Group lessons",
  "weekend-availability": "Weekend availability",
  "ea-accredited": "EA accredited",
};
export const SKILL_NAMES: Record<string, string> = {
  "lateral-work": "Lateral work",
  "dressage-test-riding": "Dressage test riding & scoring",
  "confidence-building": "Confidence building",
  "competition-preparation": "Competition preparation",
  "jumping-technique": "Jumping technique & gridwork",
  "first-show-preparation": "First-show preparation",
  "cross-country-schooling": "Cross-country schooling",
  "stock-work": "Stock work & cattle handling",
  "starting-young-horses": "Starting young horses",
  "groundwork-handling": "Groundwork & handling",
  "trick-training": "Trick training",
  "problem-behaviour": "Problem behaviour & re-schooling",
  "spooking-napping": "Spooking & napping",
  "adult-beginners": "Adult beginners",
  "returning-to-riding": "Returning to riding",
  "returning-after-fall": "Getting back on after a fall",
  "rider-biomechanics": "Rider biomechanics & position",
};

// A varied but deterministic setup mix — every mock coach gets 1–2 of
// these, cycling through so the "setup" facet has real coverage to filter
// on rather than every coach looking identical.
const ATTRIBUTE_ROTATION = [
  ["own-arena", "beginners-welcome"],
  ["horses-available", "group-lessons"],
  ["indoor-arena", "weekend-availability"],
  ["ea-accredited"],
  ["nervous-riders", "ndis-registered"],
  ["own-arena", "children-juniors"],
  ["agistment-available"],
  ["xc-course-on-site", "own-arena"],
  ["adults-only", "weekend-availability"],
];

// Unsplash (free license — https://unsplash.com/license), hand-picked per
// discipline: polished arena/competition shots for the more formal
// disciplines, warmer natural-connection shots for liberty/bridleless/
// natural horsemanship, and every candidate was actually looked at first
// to skip anything showing a tense or stressed-looking horse (pinned
// ears, open mouth, hollow back, whites of the eyes) — see CLAUDE.md.
const PHOTO_BY_DISCIPLINE: Record<string, string> = {
  dressage: "https://images.unsplash.com/photo-1579113813543-fa41eb8bf556",
  "show-jumping": "https://images.unsplash.com/photo-1613085411234-9c83af5562d8",
  eventing: "https://images.unsplash.com/photo-1784841607964-0a48a3b1a307",
  western: "https://images.unsplash.com/photo-1624125278758-c0572f6ebc55",
  campdrafting: "https://images.unsplash.com/photo-1547700094-a0b42d320937",
  liberty: "https://images.unsplash.com/photo-1589801837979-0eecc7c4f3c1",
  bridleless: "https://images.unsplash.com/photo-1636738176866-ae2c0a80d614",
  "natural-horsemanship": "https://images.unsplash.com/photo-1629366794937-fb2c3cc69927",
  "working-equitation": "https://images.unsplash.com/photo-1726209503049-a705ac3fe28f",
  "pony-club": "https://images.unsplash.com/photo-1726209451255-93951e0f4a46",
  "para-equestrian": "https://images.unsplash.com/photo-1584817791214-a47da4499486",
};

function photoFor(disciplineSlug: string) {
  return disciplinePhoto(disciplineSlug, 800);
}

// Exported so any component (e.g. the homepage's featured-disciplines strip)
// can reuse the same hand-picked, stress-signal-checked photo set instead of
// duplicating discipline→Unsplash-ID mappings.
export function disciplinePhoto(disciplineSlug: string, width = 800) {
  const base = PHOTO_BY_DISCIPLINE[disciplineSlug] ?? PHOTO_BY_DISCIPLINE.dressage;
  return `${base}?auto=format&fit=crop&w=${width}&q=80`;
}

const HEADLINE_TEMPLATES = [
  (discipline: string, town: string) => `${discipline} coaching for riders in ${town} and surrounds.`,
  (discipline: string, town: string) => `Helping ${town} riders build confidence in ${discipline.toLowerCase()}.`,
  (discipline: string, town: string) => `${discipline}, taught at your property or mine, based near ${town}.`,
  (discipline: string) => `From first lesson to competition-ready — ${discipline.toLowerCase()} coaching.`,
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type MockCoach = {
  slug: string;
  name: string;
  suburb: string;
  state: string;
  lat: number;
  long: number;
  headline: string;
  bio: string;
  disciplineSlugs: string[];
  skillSlugs: string[];
  attributeSlugs: string[];
  qualifications: string[];
  tier: "standard" | "standard_plus_clinics";
  photoUrl: string;
  contact: {
    email: string | null;
    phone: string | null;
    facebookUrl: string | null;
    showContactForm: boolean;
  };
};

// Deterministic Australian-looking mobile number from the coach's index —
// not random, so the same coach always gets the same number across builds.
function mockPhone(i: number) {
  const n = 400000000 + ((i * 9973) % 100000000);
  const digits = String(n).padStart(9, "0");
  return `04${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

// Contact-channel mix, varied across the roster so search/browse pages show
// every real toggle combination a coach can choose (see the dashboard's
// "Contact & enquiries" section). Weighted so most coaches show phone + the
// in-app form — the two the client asked to be the common case — with a
// spread of other combinations (email instead of/as well as phone, a
// Facebook-only coach with the form switched off, a couple with everything)
// so the design isn't only ever demoed in one configuration.
function mockContact(i: number, slug: string): MockCoach["contact"] {
  const bucket = i % 10;
  const phone = mockPhone(i);
  const email = `${slug.replace(/-\d+$/, "")}@example.com`;
  const facebookUrl = `https://facebook.com/${slug.replace(/-\d+$/, "")}`;

  switch (true) {
    case bucket <= 4: // 50% — phone + form, the common case
      return { email: null, phone, facebookUrl: null, showContactForm: true };
    case bucket <= 6: // 20% — phone + email + form
      return { email, phone, facebookUrl: null, showContactForm: true };
    case bucket === 7: // 10% — form only, no phone/email published
      return { email: null, phone: null, facebookUrl: null, showContactForm: true };
    case bucket === 8: // 10% — email + form, no phone
      return { email, phone: null, facebookUrl: null, showContactForm: true };
    default: // 10% (bucket 9) — phone + Facebook, form switched off
      return { email: null, phone, facebookUrl, showContactForm: false };
  }
}

const COACH_COUNT = 50;

export const mockCoaches: MockCoach[] = Array.from({ length: COACH_COUNT }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const town = TOWNS[i % TOWNS.length];
  const primaryDiscipline = DISCIPLINE_SLUGS[i % DISCIPLINE_SLUGS.length];
  const secondaryDiscipline = DISCIPLINE_SLUGS[(i + 4) % DISCIPLINE_SLUGS.length];
  const disciplineSlugs =
    i % 3 === 0 ? [primaryDiscipline, secondaryDiscipline] : [primaryDiscipline];
  const disciplineName = getDisciplineBySlug(primaryDiscipline)?.name ?? primaryDiscipline;
  const years = 3 + (i % 12);
  const slug = `${slugify(name)}-${i}`;

  // Two skills from the discipline's curated suggestion list (same one the
  // dashboard offers a real coach once they tick that discipline), picked
  // by index so the mix varies coach to coach rather than every dressage
  // coach listing the exact same two skills.
  const disciplineSkills = SKILLS_BY_DISCIPLINE[primaryDiscipline] ?? [];
  const skillSlugs = disciplineSkills.length
    ? [disciplineSkills[i % disciplineSkills.length], disciplineSkills[(i + 2) % disciplineSkills.length]].filter(
        (s, idx, arr) => arr.indexOf(s) === idx
      )
    : [];
  const attributeSlugs = ATTRIBUTE_ROTATION[i % ATTRIBUTE_ROTATION.length];

  return {
    slug,
    name,
    suburb: town.suburb,
    state: town.state,
    lat: town.lat,
    long: town.long,
    headline: HEADLINE_TEMPLATES[i % HEADLINE_TEMPLATES.length](disciplineName, town.suburb),
    bio: `${firstName} has spent ${years} year${years === 1 ? "" : "s"} coaching ${disciplineName.toLowerCase()} around ${town.suburb} ${town.state}, working with riders at every level from their first lesson through to competition.`,
    disciplineSlugs,
    skillSlugs,
    attributeSlugs,
    qualifications: QUALIFICATIONS_BY_DISCIPLINE[primaryDiscipline] ?? [],
    tier: i % 5 < 2 ? "standard_plus_clinics" : "standard",
    photoUrl: photoFor(primaryDiscipline),
    contact: mockContact(i, slug),
  };
});

export function getMockCoachBySlug(slug: string) {
  return mockCoaches.find((c) => c.slug === slug);
}

type SearchFilter = {
  disciplineSlugs?: string[];
  skillSlugs?: string[];
  attributeSlugs?: string[];
  lat?: number | null;
  long?: number | null;
  radiusKm?: number;
};

export type MockCoachCard = {
  slug: string;
  name: string;
  suburb: string;
  state: string;
  headline: string;
  disciplineNames: string[];
  skillNames: string[];
  attributeNames: string[];
  photoUrl: string;
  distanceKm: number | null;
};

function toCard(coach: MockCoach, distanceKm: number | null): MockCoachCard {
  return {
    slug: coach.slug,
    name: coach.name,
    suburb: coach.suburb,
    state: coach.state,
    headline: coach.headline,
    disciplineNames: coach.disciplineSlugs.map((s) => getDisciplineBySlug(s)?.name ?? s),
    skillNames: coach.skillSlugs.map((s) => SKILL_NAMES[s] ?? s),
    attributeNames: coach.attributeSlugs.map((s) => ATTRIBUTE_NAMES[s] ?? s),
    photoUrl: coach.photoUrl,
    distanceKm,
  };
}

// Mirrors searchCoaches()'s filter semantics (src/lib/supabase/queries.ts)
// so the two result sets can be concatenated and sorted together. OR within
// a facet, AND across facets — matching the real multi-select search.
export function searchMockCoaches({
  disciplineSlugs,
  skillSlugs,
  attributeSlugs,
  lat,
  long,
  radiusKm = 50,
}: SearchFilter): MockCoachCard[] {
  if (!MOCK_COACHES_ENABLED) return [];

  return mockCoaches
    .filter(
      (c) =>
        !disciplineSlugs ||
        disciplineSlugs.length === 0 ||
        c.disciplineSlugs.some((s) => disciplineSlugs.includes(s))
    )
    .filter(
      (c) => !skillSlugs || skillSlugs.length === 0 || c.skillSlugs.some((s) => skillSlugs.includes(s))
    )
    .filter(
      (c) =>
        !attributeSlugs ||
        attributeSlugs.length === 0 ||
        c.attributeSlugs.some((s) => attributeSlugs.includes(s))
    )
    .map((c) => {
      const distanceKm = lat != null && long != null ? haversineKm(lat, long, c.lat, c.long) : null;
      return { coach: c, distanceKm };
    })
    .filter(({ distanceKm }) => lat == null || long == null || (distanceKm ?? Infinity) <= radiusKm)
    .map(({ coach, distanceKm }) => toCard(coach, distanceKm));
}

export function getMockCoachesByDiscipline(disciplineSlug: string): MockCoachCard[] {
  return searchMockCoaches({ disciplineSlugs: [disciplineSlug] });
}
