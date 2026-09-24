/**
 * The horse care professions the parent brand covers, all live at launch
 * (decided 23 Sep 2026). Each has its own section at `/<slug>` (e.g.
 * `/farriers`), listing its professionals; until the schema has a
 * profession column those listings come from src/lib/mock-professionals.ts.
 *
 * This is a plain list, not a database table, for now. The schema plan
 * (CLAUDE.md, "Professions above disciplines") turns each entry into a
 * `terms` row of kind profession.
 *
 * Routes (decided 23 Sep 2026): `/horse-care` is the index of every
 * profession; each open profession has a top-level section (`/farriers`,
 * later `/farriers/[speciality]` and `/farriers/in/[area]`) per
 * content/handbook/site-structure.html, and the old `/horse-care/[slug]`
 * pages 301 there. `sectionHref` is the one place that switch happens:
 * set `open: false` on an entry and every link falls back to
 * `/horse-care/<slug>`.
 */
export type Profession = {
  slug: string;
  /** Plural, as it appears in the navigation. */
  name: string;
  /** Lower-case singular, for running copy ("Find a farrier"). */
  singular: string;
  /** Shorter label for tight spots (the hero tiles), when `name` won't fit. */
  short?: string;
  /** One line, used on the section page and the horse care tiles. */
  blurb: string;
  /** False sends links to /horse-care/<slug> instead of the section. */
  open: boolean;
};

/** Where a link to this profession should go: its section, or /horse-care/<slug> if closed. */
export function sectionHref(p: Profession): string {
  return p.open ? `/${p.slug}` : `/horse-care/${p.slug}`;
}

export const horseCare: Profession[] = [
  {
    slug: "farriers",
    singular: "farrier",
    name: "Farriers",
    open: true,
    blurb: "Trimming, shoeing and remedial work, on a cycle that suits your horse.",
  },
  {
    slug: "vets",
    singular: "vet",
    name: "Vets",
    open: true,
    blurb: "Equine veterinary practices, from routine care to lameness work-ups.",
  },
  {
    slug: "physiotherapists",
    singular: "physiotherapist",
    short: "Physios",
    name: "Physiotherapists",
    open: true,
    blurb: "Rehabilitation and movement work, usually alongside your vet.",
  },
  {
    slug: "bodyworkers",
    singular: "bodyworker",
    name: "Bodyworkers",
    open: true,
    blurb: "Massage, myofunctional and soft-tissue therapists.",
  },
  {
    slug: "chiropractors",
    singular: "chiropractor",
    name: "Chiropractors",
    open: true,
    blurb: "Equine chiropractic and osteopathic adjustment.",
  },
  {
    slug: "dentists",
    singular: "dentist",
    name: "Dentists",
    open: true,
    blurb: "Routine dentistry and equine dental technicians.",
  },
  {
    slug: "saddle-fitters",
    singular: "saddle fitter",
    name: "Saddle fitters",
    open: true,
    blurb: "Fitting, flocking and assessment, at home or at a clinic.",
  },
  {
    slug: "nutritionists",
    singular: "nutritionist",
    name: "Nutritionists",
    open: true,
    blurb: "Feed and condition advice for the work your horse is actually doing.",
  },
];

export function getProfessionBySlug(slug: string): Profession | undefined {
  return horseCare.find((p) => p.slug === slug);
}

/**
 * Paths that belong to the Horse care door: the index, every profession's
 * section, and professional profiles (which are all horse care today; coach
 * profiles are still at /coaches/[slug]). Drives `data-door` (the steel
 * accent) and the parent navigation. The inline script in layout.tsx does
 * the same test from HORSE_CARE_PREFIXES for the first paint.
 */
export const HORSE_CARE_PREFIXES = ["/horse-care", "/profile", ...horseCare.filter((p) => p.open).map((p) => `/${p.slug}`)];

export function isHorseCarePath(pathname: string) {
  return HORSE_CARE_PREFIXES.some((pre) => pathname === pre || pathname.startsWith(`${pre}/`));
}

/**
 * Referrers that count as horse care results, for "← Back to results": a
 * RegExp source string, since a RegExp can't cross from a server component
 * into the client one.
 */
export const HORSE_CARE_RESULTS = String.raw`/(horse-care|${horseCare.map((p) => p.slug).join("|")})(/|\?|$)`;
