// Placeholder discipline taxonomy — becomes a `disciplines` DB table once
// Supabase is wired up (see CLAUDE.md / build plan). Kept extensible: the
// UI iterates this list, never hardcodes a fixed count of disciplines.
export type Discipline = {
  slug: string;
  name: string;
  blurb: string;
};

export const disciplines: Discipline[] = [
  {
    slug: "bridleless",
    name: "Bridleless",
    blurb: "Riding without a bridle, built step by step from the groundwork up.",
  },
  {
    slug: "working-equitation",
    name: "Working Equitation",
    blurb:
      "Dressage, ease of handling and speed — the all-round discipline, taught by coaches who compete in it.",
  },
  {
    slug: "liberty",
    name: "Liberty",
    blurb: "Connection and communication at liberty, with no tack between you and the horse.",
  },
  {
    slug: "western",
    name: "Western",
    blurb: "Western riding fundamentals through to reining, cutting and campdraft prep.",
  },
  {
    slug: "dressage",
    name: "Dressage",
    blurb: "Classical dressage from first flatwork through to FEI-level training.",
  },
  {
    slug: "show-jumping",
    name: "Show Jumping",
    blurb: "Course walking, striding and jump technique for the competition ring.",
  },
  {
    slug: "eventing",
    name: "Eventing",
    blurb: "Dressage, cross-country and show jumping, coached across all three phases.",
  },
  {
    slug: "campdrafting",
    name: "Campdrafting",
    blurb: "Cattle work and camp craft for the drafting arena.",
  },
  {
    slug: "natural-horsemanship",
    name: "Natural Horsemanship",
    blurb: "Groundwork-first training focused on horse psychology and partnership.",
  },
  {
    slug: "pony-club",
    name: "Pony Club",
    blurb: "All-round instruction for junior and pony club riders working through their levels.",
  },
  {
    slug: "para-equestrian",
    name: "Para-Equestrian",
    blurb: "Adaptive coaching for para riders, across grades and disciplines.",
  },
];

export function getDisciplineBySlug(slug: string): Discipline | undefined {
  return disciplines.find((d) => d.slug === slug);
}
