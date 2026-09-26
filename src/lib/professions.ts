/**
 * Professions: types, the code fallback, and pure helpers.
 *
 * The professions themselves live in the database (terms of kind
 * 'profession' + profession_details, The Site as a CMS §04 A-B) and are read
 * by getProfessions() in src/lib/cms/read.ts. Nothing here reads the
 * database, so client components can import it; they receive the live list
 * as props.
 *
 * FALLBACK_PROFESSIONS is the code default the CMS rule asks for: what the
 * site shows if the database can't be reached. It matches the seed
 * (supabase/seed/professions.mjs) as of 24 Sep 2026; admin edits don't
 * change it and don't need to.
 *
 * Routes: every live profession has a top-level section (/farriers);
 * `sectionHref` is the one place that decides a profession's link.
 */
export type Door = "coaches" | "horse_care";
export type LaunchState = "draft" | "taking_signups" | "live";

export type Step = { title: string; body: string };
/** One item of the profile completeness score (profession_details.completeness). `key` is what the dashboard checks. */
export type CompletenessItem = { key: "photo" | "bio" | "terms" | "location" | "testimonials" | "video"; label: string; weight: number };
export type EnquiryOption = { value: string; label: string };

export type Profession = {
  id: string | null;
  slug: string;
  /** Display plural, as in the navigation ("Saddle fitters"). */
  name: string;
  /** Lower-case singular, for running copy ("Find a farrier"). */
  singular: string;
  /** Lower-case plural ("saddle fitters"). */
  plural: string;
  /** Shorter label for tight spots (the hero tiles), when `name` won't fit. */
  short?: string;
  /** One line, used on the section page and the tiles. */
  blurb: string;
  door: Door;
  glyphKey: string;
  launchState: LaunchState;
  /** Shorthand for launchState === "live": has a public section. */
  open: boolean;
  termNoun: string;
  termNounPlural: string;
  audienceNoun: string;
  yearsLabel: string;
  jobTitle: string;
  heroHeadline: string;
  heroLead: string;
  heroLeadShort: string;
  pitch: string;
  steps: Step[];
  enquiryOptions: EnquiryOption[];
  eventsEnabled: boolean;
  remoteAllowed: boolean;
  /** Specialities most of them do: listed first in onboarding, never pre-ticked. */
  commonTermIds?: string[];
  sortOrder: number;
  completeness: CompletenessItem[];
  /** Questions and answers for this profession's pitch page. */
  faq: Step[];
  /** The profession's own photo in the term-images bucket, when one's been uploaded (else the launch stock photo). */
  imagePath?: string | null;
  /** This profession's own name for a plan, when the shared one reads oddly ("Clinic" for a farrier). Keyed by tier. */
  tierLabels: Record<string, string>;
};

const completeness = (termLabel: string, photoLabel: string): CompletenessItem[] => [
  { key: "photo", label: photoLabel, weight: 1 },
  { key: "bio", label: "Bio written", weight: 1 },
  { key: "terms", label: termLabel, weight: 1 },
  { key: "location", label: "Location set", weight: 1 },
  { key: "testimonials", label: "Three testimonials", weight: 1 },
  { key: "video", label: "Intro video", weight: 1 },
];

const COACH_STEPS: Step[] = [
  { title: "Tell us what you ride, and where", body: "Pick your discipline and your town. Every listing is a real coach, not an agency." },
  { title: "Read their profile", body: "Qualifications, disciplines, how far they travel, and words from riders they've taught." },
  { title: "Get in touch, direct", body: "No commission, no booking fee. You deal with your coach the way riders always have." },
];
const HORSE_CARE_STEPS: Step[] = [
  { title: "Tell us what your horse needs, and where", body: "Pick the kind of help and the suburb your horse lives in. Every listing is a real person, not a booking agency." },
  { title: "See who covers your paddock", body: "Each professional sets their own travel radius and lists the work they actually do." },
  { title: "Get in touch, direct", body: "No commission and no booking fee. You sort out the visit with them yourself." },
];
const VISITS: EnquiryOption[] = [
  { value: "regular", label: "Regular visits" },
  { value: "one_off", label: "One-off visit" },
];

function horseCare(p: Pick<Profession, "slug" | "name" | "singular" | "plural" | "blurb" | "jobTitle"> & Partial<Profession>): Profession {
  return {
    id: null,
    door: "horse_care",
    glyphKey: p.slug,
    launchState: "live",
    open: true,
    termNoun: "speciality",
    termNounPlural: "specialities",
    audienceNoun: "horse owner",
    yearsLabel: "years in practice",
    heroHeadline: "",
    heroLead: p.blurb,
    heroLeadShort: "",
    pitch: "",
    steps: HORSE_CARE_STEPS,
    enquiryOptions: VISITS,
    eventsEnabled: true,
    remoteAllowed: false,
    sortOrder: 0,
    completeness: completeness("Specialities tagged", "A photo of you at work"),
    faq: [],
    tierLabels: {},
    ...p,
  };
}

export const FALLBACK_PROFESSIONS: Profession[] = [
  {
    id: null,
    slug: "coaches",
    name: "Riding coaches",
    singular: "coach",
    plural: "coaches",
    blurb: "Coaches for every discipline, from first lessons to competition.",
    door: "coaches",
    glyphKey: "coaches",
    launchState: "live",
    open: true,
    termNoun: "discipline",
    termNounPlural: "disciplines",
    audienceNoun: "rider",
    yearsLabel: "years coaching",
    jobTitle: "Riding coach",
    heroHeadline: "Find a coach for",
    heroLead: "Search riding coaches across Australia by what you ride and where you are. Free for riders, always.",
    heroLeadShort: "Search by what you ride and where you are. Free for riders, always.",
    pitch: "",
    steps: COACH_STEPS,
    enquiryOptions: [
      { value: "regular", label: "Regular lessons" },
      { value: "one_off", label: "One-off" },
      { value: "clinic", label: "Clinic" },
    ],
    eventsEnabled: true,
    remoteAllowed: true,
    sortOrder: 0,
    completeness: completeness("Disciplines tagged", "A photo of you coaching"),
    faq: [],
    tierLabels: {},
  },
  horseCare({ slug: "farriers", name: "Farriers", singular: "farrier", plural: "farriers", jobTitle: "Farrier", yearsLabel: "years shoeing", sortOrder: 1,
    blurb: "Trimming, shoeing and remedial work, on a cycle that suits your horse.",
    heroHeadline: "Find a farrier who'll come to you.",
    heroLead: "Search by what your horse needs and where it lives. Barefoot trims, remedial work, hot and cold shoeing." }),
  horseCare({ slug: "vets", name: "Vets", singular: "vet", plural: "vets", jobTitle: "Equine veterinarian", sortOrder: 2,
    blurb: "Equine veterinary practices, from routine care to lameness work-ups." }),
  horseCare({ slug: "physiotherapists", name: "Equine physiotherapy", short: "Physiotherapy", singular: "physiotherapy practitioner", plural: "physiotherapy practitioners", jobTitle: "Equine physiotherapy practitioner", sortOrder: 3,
    blurb: "Rehabilitation and movement work, usually alongside your vet." }),
  horseCare({ slug: "bodyworkers", name: "Bodyworkers", singular: "bodyworker", plural: "bodyworkers", jobTitle: "Equine bodyworker", sortOrder: 4,
    blurb: "Massage, myofunctional and soft-tissue therapists." }),
  horseCare({ slug: "chiropractors", name: "Equine chiropractic", short: "Chiropractic", singular: "chiropractic practitioner", plural: "chiropractic practitioners", jobTitle: "Equine chiropractic practitioner", sortOrder: 5,
    blurb: "Equine chiropractic and osteopathic adjustment." }),
  horseCare({ slug: "dentists", name: "Dentists", singular: "dentist", plural: "dentists", jobTitle: "Equine dentist", sortOrder: 6,
    blurb: "Routine dentistry and equine dental technicians." }),
  horseCare({ slug: "saddle-fitters", name: "Saddle fitters", singular: "saddle fitter", plural: "saddle fitters", jobTitle: "Saddle fitter", sortOrder: 7,
    blurb: "Fitting, flocking and assessment, at home or at a clinic." }),
  horseCare({ slug: "nutritionists", name: "Nutritionists", singular: "nutritionist", plural: "nutritionists", jobTitle: "Equine nutritionist", remoteAllowed: true, sortOrder: 8,
    blurb: "Feed and condition advice for the work your horse is actually doing." }),
];

// ── Pure helpers: every one takes the list it works on ──────────────────────

/** Where a link to this profession goes: its section when live, else /horse-care/<slug>. */
export function sectionHref(p: Pick<Profession, "slug" | "open">): string {
  return p.open ? `/${p.slug}` : `/horse-care/${p.slug}`;
}

/** The Horse care door's professions, in menu order. */
export function horseCareOf(list: Profession[]): Profession[] {
  return list.filter((p) => p.door === "horse_care").sort((a, b) => a.sortOrder - b.sortOrder);
}

/** A profession by slug, from the given list. */
export function findProfession(list: Profession[], slug: string): Profession | undefined {
  return list.find((p) => p.slug === slug);
}

/**
 * Paths that belong to the Horse care door: the index and every live horse
 * care section with everything under it. Drives `data-door` (the steel
 * accent) and the parent navigation, in the first-paint script and the
 * header. Built from the rows, so a new profession joins the door with no
 * deploy. Profiles aren't here: /profile holds every profession, so each
 * profile names its own door (src/components/page-context.tsx).
 */
export function horseCarePrefixes(list: Profession[]): string[] {
  return ["/horse-care", "/for-professionals", ...horseCareOf(list).filter((p) => p.open).map((p) => `/${p.slug}`)];
}

export function pathInPrefixes(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((pre) => pathname === pre || pathname.startsWith(`${pre}/`));
}

/**
 * Referrers that count as horse care results, for "← Back to results": a
 * RegExp source string, since a RegExp can't cross from a server component
 * into a client one.
 */
export function horseCareResultsPattern(list: Profession[]): string {
  return String.raw`/(horse-care|${horseCareOf(list).map((p) => p.slug).join("|")})(/|\?|$)`;
}
