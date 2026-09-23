/**
 * The internal handbook — the planning documents Kim and Alana work from.
 *
 * These live as standalone HTML files in `content/handbook/` rather than in the
 * database, for three reasons:
 *
 *   1. They keep their own typography ("The Paddock Edit"), which no amount of
 *      markdown would survive. Tiles, comparison tables, callouts and the bar
 *      charts are all part of how these documents argue.
 *   2. Git is the version history. Every edit is a commit, with a diff, for free.
 *   3. Cowork edits the file directly. No migration, no editor to maintain, no
 *      second copy to drift out of sync.
 *
 * Each file is rendered inside an iframe (see the `raw` route) so its stylesheet
 * can never collide with the app's own. That means a document can be rewritten
 * wholesale without any risk to the site around it.
 *
 * To add a document: drop the HTML in `content/handbook/` and add a row below.
 *
 * This module is deliberately free of `node:` imports so the manifest stays safe
 * to import from a client component. Reading the files lives next door in
 * `handbook-content.ts`, which is server-only.
 */

export type HandbookAudience = "Both" | "Kim" | "Build";

export type HandbookDoc = {
  slug: string;
  file: string;
  title: string;
  /** The small caps label above the title on the index. */
  kicker: string;
  /** One sentence — what the document decides, not what it covers. */
  summary: string;
  /** Who it is written for. Drives the badge on the index card. */
  audience: HandbookAudience;
  /**
   * ISO date of the last meaningful edit, maintained by hand.
   *
   * Deliberately not the file's mtime: on Vercel every bundled file carries the
   * build timestamp, so mtime would report "updated today" after any unrelated
   * deploy. A date somebody has to change is the only one that stays true.
   */
  updated: string;
};

export const HANDBOOK_DOCS: HandbookDoc[] = [
  {
    slug: "catch-up-agenda",
    file: "catch-up-agenda.html",
    title: "Nutting It Out",
    kicker: "Agenda",
    summary:
      "The running agenda for Kim and Alana's catch-ups — what is settled, what is still open, and the order to work through it.",
    audience: "Both",
    updated: "2026-09-22",
  },
  {
    slug: "before-we-start",
    file: "before-we-start.html",
    title: "Before We Start",
    kicker: "Partnership",
    summary:
      "The partnership setup: the split, how Alana is paid, who pays for what, roles, and the questions for Kim's accountant.",
    audience: "Both",
    updated: "2026-09-22",
  },
  {
    slug: "site-structure",
    file: "site-structure.html",
    title: "One Site, Two Professions",
    kicker: "Site structure",
    summary:
      "Why coaches and farriers share one site, what the site is called, which domain it launches on, and the routes, redirects and schema that follow.",
    audience: "Both",
    updated: "2026-09-22",
  },
  {
    slug: "first-100-coaches",
    file: "first-100-coaches.html",
    title: "The First 100 Coaches",
    kicker: "Marketing",
    summary:
      "The twelve-month plan for getting coaches on the site, with the checkpoints that decide whether to keep going.",
    audience: "Kim",
    updated: "2026-09-22",
  },
  {
    slug: "coach-tiers",
    file: "coach-tiers.html",
    title: "What They're Buying",
    kicker: "The offer",
    summary:
      "Three tiers, what goes in each, and the argument a coach has to believe before they hand over a card.",
    audience: "Both",
    updated: "2026-09-07",
  },
  {
    slug: "about-page",
    file: "about-page.html",
    title: "Who We Are",
    kicker: "Page copy",
    summary:
      "The About page written out in full, the two decisions it needs, and the facts still waiting on Kim.",
    audience: "Both",
    updated: "2026-09-17",
  },
  {
    slug: "search-foundation",
    file: "search-foundation.html",
    title: "How Riders Find Us",
    kicker: "Build spec",
    summary:
      "The search and page-taxonomy spec: what earns a page, the fallback ladder, and how a coach always lands somewhere.",
    audience: "Build",
    updated: "2026-09-07",
  },
  {
    slug: "proof-of-value",
    file: "proof-of-value.html",
    title: "Worth Paying For",
    kicker: "Build spec",
    summary:
      "The analytics spec — what gets counted, what a coach is shown, and the honest zero-month email.",
    audience: "Build",
    updated: "2026-09-07",
  },
];

export function getHandbookDoc(slug: string): HandbookDoc | undefined {
  return HANDBOOK_DOCS.find((doc) => doc.slug === slug);
}
