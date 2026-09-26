import type { SupabaseClient } from "@supabase/supabase-js";
import { fillVariables } from "@/lib/cms/read";
import { CONTACT_EMAIL } from "@/lib/site-url";

/**
 * Competitions (The Marketing Engine M10). Judged on skill by default: a
 * competition decided on merit against published criteria needs no permit
 * anywhere in Australia. A random draw needs a permit in the ACT over $3,000
 * in total prizes (the lowest threshold), so a draw above that is refused,
 * here and by a database check. Entering is free, one each, 18 or over or
 * entered by a parent, and never signs anyone up to anything except by the
 * separate box.
 */
export const DRAW_LIMIT_CENTS = 300_000;
export const MARKETING_FILES = "marketing-files";
/** Entrants' photos: a private bucket, seen through signed links by whoever judges. */
export const ENTRY_PHOTOS = "entry-photos";

export type Competition = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  question: string;
  prize: string;
  prize_value_cents: number;
  judging: "skill" | "draw";
  criteria: string;
  who_can_enter: string;
  opens_at: string | null;
  closes_at: string | null;
  winners_by: string | null;
  how_winners_told: string;
  winner_count: number;
  image_path: string | null;
  image_alt: string;
  status: "draft" | "published" | "judged";
  judged_at: string | null;
  judging_note: string;
  entry_photo: "none" | "optional" | "required";
  updated_at: string;
};

export type Phase = "draft" | "upcoming" | "open" | "closed" | "judged";

export function phase(c: Pick<Competition, "status" | "opens_at" | "closes_at">, now = new Date()): Phase {
  if (c.status === "draft") return "draft";
  if (c.status === "judged") return "judged";
  if (c.opens_at && now < new Date(c.opens_at)) return "upcoming";
  if (c.closes_at && now >= new Date(c.closes_at)) return "closed";
  return "open";
}

export const money = (cents: number) => `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const melbourneDateTime = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
export const longDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

/** What's still missing before it can go public: every term the law expects, and the promoter's ABN. */
export function missingForPublish(c: Competition, abn: string): string[] {
  const missing: string[] = [];
  if (!abn) missing.push("the ABN (Admin → Settings): the terms have to name the promoter");
  if (!c.question.trim()) missing.push("the question entrants answer");
  if (!c.prize.trim()) missing.push("the prize");
  if (c.prize_value_cents <= 0) missing.push("the prize's value");
  if (!c.who_can_enter.trim()) missing.push("who can enter");
  if (!c.opens_at || !c.closes_at) missing.push("when it opens and closes");
  else if (new Date(c.closes_at) <= new Date(c.opens_at)) missing.push("a close after the open");
  if (!c.winners_by) missing.push("when the winner is chosen by");
  else if (c.closes_at && new Date(`${c.winners_by}T23:59:59+10:00`) < new Date(c.closes_at)) missing.push("a result date after entries close");
  if (!c.how_winners_told.trim()) missing.push("how winners are told");
  if (c.judging === "skill" && !c.criteria.trim()) missing.push("the judging criteria");
  if (c.judging === "draw" && c.prize_value_cents > DRAW_LIMIT_CENTS) missing.push(`a smaller prize pool: a random draw over ${money(DRAW_LIMIT_CENTS)} needs a permit, so make it a skill competition instead`);
  return missing;
}

/** The full terms, from the competitions.terms block and the competition's own fields. */
export function termsFor(c: Competition, abn: string, sections: { title: string; body: string }[]) {
  const vars = {
    abn: abn || "[ABN]",
    contact_email: CONTACT_EMAIL,
    who_can_enter: c.who_can_enter,
    opens: c.opens_at ? melbourneDateTime(c.opens_at) : "[open]",
    closes: c.closes_at ? melbourneDateTime(c.closes_at) : "[close]",
    judging:
      c.judging === "skill"
        ? `This is a game of skill: chance plays no part. Entries are judged on these criteria: ${c.criteria}`
        : `The winner is drawn at random from every confirmed entry.`,
    prize: c.prize,
    prize_value: money(c.prize_value_cents),
    winner_count_text: c.winner_count === 1 ? "There is one winner." : `There are ${c.winner_count} winners, each getting the prize.`,
    winners_by: c.winners_by ? longDate(c.winners_by) : "[date]",
    how_winners_told: c.how_winners_told,
  };
  return sections.map((s) => ({ title: s.title, body: fillVariables(s.body, vars) }));
}

export const fileUrl = (db: SupabaseClient, path: string) => db.storage.from(MARKETING_FILES).getPublicUrl(path).data.publicUrl;

/** "Samantha Rowe" and "vic" → "Samantha R., VIC": what a winner's line shows. */
export function winnerLine(name: string, state: string | null) {
  const parts = name.trim().split(/\s+/);
  const shown = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
  return state ? `${shown}, ${state.toUpperCase()}` : shown;
}
