// Sample data standing in for the `coach_profiles` table until Supabase is
// wired up (see build plan, phase 2). Shape mirrors the planned DB columns
// so swapping this for a real query later is a like-for-like replacement.
export type PlaceholderCoach = {
  slug: string;
  name: string;
  headline: string;
  bio: string;
  suburb: string;
  state: string;
  disciplines: string[]; // discipline slugs
  qualifications: string[];
  tier: "standard" | "standard_plus_clinics";
  testimonials: { quote: string; author: string }[];
  clinics: { title: string; date: string; location: string }[];
};

export const placeholderCoaches: PlaceholderCoach[] = [
  {
    slug: "marnie-tolhurst",
    name: "Marnie Tolhurst",
    headline: "Working equitation, from first flatwork to your first competition.",
    bio: "Marnie has spent twelve years coaching working equitation riders across the Darling Downs, with a focus on adult returning riders building confidence back up.",
    suburb: "Toowoomba",
    state: "QLD",
    disciplines: ["working-equitation", "dressage"],
    qualifications: ["EA Level 1 Coach", "Working Equitation Australia accredited"],
    tier: "standard_plus_clinics",
    testimonials: [
      {
        quote: "Marnie worked out why I'd been avoiding canter for a year, and started there instead.",
        author: "Rider, Toowoomba",
      },
    ],
    clinics: [
      { title: "Weekend Working Equitation Clinic", date: "2026-10-18", location: "Toowoomba QLD" },
    ],
  },
  {
    slug: "elise-farrar",
    name: "Elise Farrar",
    headline: "Bridleless riding, built from the groundwork up.",
    bio: "Elise teaches bridleless riding at your property or hers, starting from groundwork fundamentals before anything comes off the horse.",
    suburb: "Crows Nest",
    state: "QLD",
    disciplines: ["bridleless", "natural-horsemanship"],
    qualifications: ["Certified Natural Horsemanship Instructor"],
    tier: "standard",
    testimonials: [],
    clinics: [],
  },
  {
    slug: "prudence-vaile",
    name: "Prudence Vaile",
    headline: "Bridleless coaching for the Adelaide Hills.",
    bio: "Prudence has been coaching bridleless riding in the Adelaide Hills for six years, with lessons available at her arena or travelling to your property.",
    suburb: "Mount Barker",
    state: "SA",
    disciplines: ["bridleless"],
    qualifications: ["EA Level 2 Coach"],
    tier: "standard_plus_clinics",
    testimonials: [
      {
        quote:
          "The listing told me what I needed to know before I ever called — qualifications, specialties, how far she'd travel.",
        author: "Rider, Adelaide Hills",
      },
    ],
    clinics: [{ title: "Bridleless Fundamentals Day", date: "2026-09-27", location: "Mount Barker SA" }],
  },
  {
    slug: "sophie-ardern",
    name: "Sophie Ardern",
    headline: "Working equitation lessons at your property.",
    bio: "Sophie travels across the New England region teaching working equitation, with an emphasis on ease-of-handling patterns for everyday riding.",
    suburb: "Moonbi",
    state: "NSW",
    disciplines: ["working-equitation"],
    qualifications: ["Working Equitation Australia accredited"],
    tier: "standard",
    testimonials: [],
    clinics: [],
  },
];

export function getCoachBySlug(slug: string) {
  return placeholderCoaches.find((c) => c.slug === slug);
}

export function getCoachesByDiscipline(disciplineSlug: string) {
  return placeholderCoaches.filter((c) => c.disciplines.includes(disciplineSlug));
}
