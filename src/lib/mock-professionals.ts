// Mock horse care professionals (farriers, vets, dentists and the rest) for
// design review, built the same way as src/lib/mock-coaches.ts and kept out
// of Supabase for the same reason: set MOCK_PROFESSIONALS_ENABLED to false,
// or delete this file and search for "mock-professionals" to find every
// page that reads it. Nothing here touches the database.
//
// Six per profession, spread over the same real towns as the mock coaches,
// so distance search and the per-profession counts behave like real data.
import { FIRST_NAMES, LAST_NAMES, TOWNS, haversineKm, mockPhone, slugify } from "@/lib/mock-coaches";
import { FALLBACK_PROFESSIONS, findProfession, horseCareOf } from "@/lib/professions";

// Mock data is code, so it builds from the code list of professions.
const horseCare = horseCareOf(FALLBACK_PROFESSIONS);

export const MOCK_PROFESSIONALS_ENABLED = true;

const PER_PROFESSION = 6;

// Unsplash (free licence, https://unsplash.com/license). Every one was
// looked at before use, same rule as the coach photos: no tense or stressed
// horse (pinned ears, open mouth, whites of the eye). The first per
// profession is its tile photo on /horse-care. Dentists get a hand at the
// muzzle and a calm eye: nearly every "horse teeth" photo on Unsplash is a
// wide-open mouth, which fails the rule.
const U = "https://images.unsplash.com/photo-";
const PHOTOS: Record<string, string[]> = {
  farriers: ["1785686744411-59275c7b6ae1", "1776893313783-34ad3ee78135", "1497369573176-0ceb5353817d"],
  vets: ["1671502726668-1fb27ea08920", "1626838974360-37255325e1b0"],
  physiotherapists: ["1672242333559-e7c8d5127e10", "1760008787138-2e5a26626d1e"],
  bodyworkers: ["1757496799113-989d55a5ff1f", "1709830697430-6e0a0c28bb8d", "1590839823121-c253bf8d1e7d"],
  chiropractors: ["1589824493580-eacaf31c2a82", "1496046053942-e02b00c2cb6b"],
  dentists: ["1595353798712-3c05a2ec64fc", "1604429287879-6bc7a7572048"],
  "saddle-fitters": ["1497624138727-ebc770ef361e", "1497624225979-f64d4f35f94a", "1761245048608-a97f22ba9b14", "1784985362711-15dfbde4413e"],
  nutritionists: ["1781274301199-58565cef09b8", "1783845976780-da1feb11aaa9", "1761673295751-a4f49c60aa5c"],
};

export function professionPhoto(professionSlug: string, width = 800, index = 0) {
  const list = PHOTOS[professionSlug] ?? PHOTOS.farriers;
  return `${U}${list[index % list.length]}?auto=format&fit=crop&w=${width}&q=80`;
}

/** What each profession lists as its specialities; the first two lead the card. */
export const SPECIALITIES: Record<string, string[]> = {
  farriers: ["Barefoot trimming", "Hot shoeing", "Cold shoeing", "Remedial shoeing", "Foal trims", "Glue-on shoes"],
  vets: ["Lameness work-ups", "Pre-purchase exams", "Vaccinations and worming", "Reproduction", "Sedated dentals", "After-hours callouts"],
  physiotherapists: ["Rehab after injury", "Pre-competition checks", "Laser and ultrasound", "Exercise programs", "Horse and rider assessments"],
  bodyworkers: ["Sports massage", "Myofascial release", "Stretching programs", "Kinesiology taping", "Pre-event massage"],
  chiropractors: ["Spinal assessment", "Pelvic alignment", "Poll and jaw work", "Performance checks", "Post-injury follow-up"],
  dentists: ["Routine floats", "Power dentistry", "Young horse first checks", "Wolf teeth", "Senior horse care"],
  "saddle-fitters": ["Fitting at home", "Reflocking", "Flexible and treeless", "Western saddles", "Pressure mapping"],
  nutritionists: ["Feed plans", "Weight management", "Performance diets", "Laminitis-prone horses", "Senior horse diets"],
};

const QUALIFICATIONS: Record<string, string> = {
  farriers: "Certificate III in Farriery",
  vets: "Bachelor of Veterinary Science",
  physiotherapists: "Postgraduate certificate in animal physiotherapy",
  bodyworkers: "Diploma of Equine Massage",
  chiropractors: "Animal chiropractic certification",
  dentists: "Equine dental technician certification",
  "saddle-fitters": "Qualified saddle fitter",
  nutritionists: "Graduate certificate in equine nutrition",
};

const HEADLINES = [
  (s: string, town: string) => `${cap(s)} for ${town} and the district around it.`,
  (s: string, town: string, a: string, b: string) => `${a} and ${b.toLowerCase()}, based near ${town}.`,
  (s: string, town: string) => `Mobile ${s}, coming to you around ${town}.`,
  (s: string, town: string, a: string) => `${a} and general ${s} work, out of ${town}.`,
];

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type MockProfessional = {
  slug: string;
  name: string;
  professionSlug: string;
  specialities: string[];
  suburb: string;
  state: string;
  lat: number;
  long: number;
  headline: string;
  bio: string;
  qualifications: string[];
  photoUrl: string;
  travelRadiusKm: number;
  yearsPractising: number;
  /** "yes" = taking new clients, "waitlist" = books full, taking names. */
  taking: "yes" | "waitlist";
  contact: { phone: string | null; email: string | null; showContactForm: boolean };
};

export const mockProfessionals: MockProfessional[] = MOCK_PROFESSIONALS_ENABLED
  ? horseCare.flatMap((p, pi) =>
      Array.from({ length: PER_PROFESSION }, (_, j) => {
        const i = pi * PER_PROFESSION + j;
        // Offset from the coach roster's name/town pattern so the two sets
        // don't read as the same people.
        const first = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
        const last = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
        const town = TOWNS[(i * 5 + pi) % TOWNS.length];
        const specs = SPECIALITIES[p.slug];
        const picked = [specs[j % specs.length], specs[(j + 2) % specs.length], specs[(j + 3) % specs.length]].slice(0, 2 + (j % 2));
        const radius = [40, 60, 80, 100, 150][i % 5];
        const name = `${first} ${last}`;
        const slug = slugify(`${name}-${p.singular}-${j}`);
        return {
          slug,
          name,
          professionSlug: p.slug,
          specialities: picked,
          suburb: town.suburb,
          state: town.state,
          lat: town.lat,
          long: town.long,
          headline: HEADLINES[i % HEADLINES.length](p.singular, town.suburb, picked[0], picked[1]),
          bio: `${first} is ${/^[aeiou]/.test(p.singular) ? "an" : "a"} ${p.singular} based in ${town.suburb} and travels up to ${radius} km for visits. Most of the work is ${picked[0].toLowerCase()} and ${picked[1].toLowerCase()}. Send a message with your horse's age, what's going on and where it's kept, and ${first} will come back to you with a time.`,
          qualifications: [QUALIFICATIONS[p.slug]],
          photoUrl: professionPhoto(p.slug, 800, j),
          travelRadiusKm: radius,
          yearsPractising: 3 + ((i * 7) % 22),
          taking: i % 5 === 3 ? "waitlist" : "yes",
          contact: {
            phone: i % 6 === 5 ? null : mockPhone(i + 500),
            email: i % 3 === 0 ? `${slugify(first)}@example.com` : null,
            showContactForm: true,
          },
        } satisfies MockProfessional;
      })
    )
  : [];

export function getMockProfessionalBySlug(slug: string) {
  return mockProfessionals.find((p) => p.slug === slug);
}

export function mockProfessionalCount(professionSlug?: string) {
  return professionSlug ? mockProfessionals.filter((p) => p.professionSlug === professionSlug).length : mockProfessionals.length;
}

/** The card shape (CoachCard's, with its own href). */
export type ProfessionalCard = {
  slug: string;
  href: string;
  name: string;
  suburb: string;
  state: string;
  headline: string;
  disciplineNames: string[];
  photoUrl: string;
  distanceKm: number | null;
  professionSlug: string;
  travelRadiusKm: number;
};

function toCard(p: MockProfessional, distanceKm: number | null): ProfessionalCard {
  const profession = findProfession(FALLBACK_PROFESSIONS, p.professionSlug);
  return {
    slug: p.slug,
    href: `/profile/${p.slug}`,
    name: p.name,
    suburb: p.suburb,
    state: p.state,
    headline: p.headline,
    disciplineNames: [cap(profession?.singular ?? ""), ...p.specialities.slice(0, 2)],
    photoUrl: p.photoUrl,
    distanceKm,
    professionSlug: p.professionSlug,
    travelRadiusKm: p.travelRadiusKm,
  };
}

/**
 * Professionals for one profession (or all), nearest first when there is a
 * point: within `radiusKm` of it, or whose own travel radius reaches it.
 * With a state, everyone based in that state, A to Z. With neither, A to Z.
 */
export function searchMockProfessionals({
  professionSlug,
  lat = null,
  long = null,
  radiusKm = 100,
  state = null,
}: {
  professionSlug?: string;
  lat?: number | null;
  long?: number | null;
  radiusKm?: number;
  state?: string | null;
}): ProfessionalCard[] {
  const pool = mockProfessionals.filter((p) => !professionSlug || p.professionSlug === professionSlug);
  if (lat != null && long != null) {
    return pool
      .map((p) => ({ p, d: haversineKm(lat, long, p.lat, p.long) }))
      .filter(({ p, d }) => d <= Math.max(radiusKm, p.travelRadiusKm))
      .sort((a, b) => a.d - b.d)
      .map(({ p, d }) => toCard(p, d));
  }
  return pool
    .filter((p) => !state || p.state === state)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => toCard(p, null));
}

/** A spread for the featured row: one per profession, in the nav's order. */
export function featuredMockProfessionals(n = 4): ProfessionalCard[] {
  return horseCare
    .map((p) => mockProfessionals.find((m) => m.professionSlug === p.slug))
    .filter((m): m is MockProfessional => Boolean(m))
    .slice(0, n)
    .map((m) => toCard(m, null));
}
