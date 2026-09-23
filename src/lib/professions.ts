/**
 * The professions the parent brand covers. Riding coaches are the only one
 * actually built — everything under `horseCare` is listed in the navigation
 * and has a real page saying it is not open yet, rather than being hidden
 * until launch day. Nothing here creates listings or lets anyone sign up.
 *
 * This is a plain list, not a database table, because none of it is user
 * data yet. When a profession does open, it gets its own provider type in
 * the schema (see CLAUDE.md, "Roadmap beyond coaches") and this entry
 * points at the real section instead of the holding page.
 */
export type Profession = {
  slug: string;
  /** Plural, as it appears in the navigation. */
  name: string;
  /** One line, used on the holding page and the section index. */
  blurb: string;
};

export const horseCare: Profession[] = [
  {
    slug: "farriers",
    name: "Farriers",
    blurb: "Trimming, shoeing and remedial work, on a cycle that suits your horse.",
  },
  {
    slug: "vets",
    name: "Vets",
    blurb: "Equine veterinary practices, from routine care to lameness work-ups.",
  },
  {
    slug: "physiotherapists",
    name: "Physiotherapists",
    blurb: "Rehabilitation and movement work, usually alongside your vet.",
  },
  {
    slug: "bodyworkers",
    name: "Bodyworkers",
    blurb: "Massage, myofunctional and soft-tissue therapists.",
  },
  {
    slug: "chiropractors",
    name: "Chiropractors",
    blurb: "Equine chiropractic and osteopathic adjustment.",
  },
  {
    slug: "dentists",
    name: "Dentists",
    blurb: "Routine dentistry and equine dental technicians.",
  },
  {
    slug: "saddle-fitters",
    name: "Saddle fitters",
    blurb: "Fitting, flocking and assessment, at home or at a clinic.",
  },
  {
    slug: "nutritionists",
    name: "Nutritionists",
    blurb: "Feed and condition advice for the work your horse is actually doing.",
  },
];

export function getProfessionBySlug(slug: string): Profession | undefined {
  return horseCare.find((p) => p.slug === slug);
}
