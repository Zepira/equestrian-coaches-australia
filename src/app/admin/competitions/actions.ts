"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formText, requireAdmin } from "@/lib/admin";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { fillVariables, getContent } from "@/lib/cms/read";
import { absoluteUrl, CONTACT_EMAIL } from "@/lib/site-url";
import { getBusinessAbn } from "@/lib/settings";
import { DRAW_LIMIT_CENTS, MARKETING_FILES, missingForPublish, money, phase, type Competition } from "@/lib/competitions";
import { slugify } from "@/lib/guides";

/**
 * Admin → Competitions (M10). The terms are fixed once entries open: a
 * change after that would change the rules people entered under. Judging
 * leaves a record (who, when, how), and the result emails each winner.
 */
const go = (id: string | null, m: string, key = "done") => redirect(`${id ? `/admin/competitions/${id}` : "/admin/competitions"}?${key}=${encodeURIComponent(m)}`);

function refresh(slug?: string) {
  revalidatePath("/competitions");
  if (slug) revalidatePath(`/competitions/${slug}`);
  revalidatePath("/admin/competitions");
}

async function load(id: string) {
  const service = createServiceSupabase()!;
  const { data } = await service.from("competitions").select("*").eq("id", id).single();
  if (!data) redirect("/admin/competitions");
  return { service, c: data as Competition };
}

export async function createCompetition(fd: FormData) {
  await requireAdmin();
  const title = formText(fd, "title", 120);
  if (!title) go(null, "Give it a title.", "error");
  const service = createServiceSupabase()!;
  let slug = slugify(title) || "competition";
  if (slug === "confirm") slug = "confirm-competition";
  const { count } = await service.from("competitions").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (count) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data } = await service.from("competitions").insert({ title, slug }).select("id").single();
  redirect(`/admin/competitions/${data!.id}`);
}

/** "2026-11-01T09:00" as Melbourne time. */
function melbourne(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map((p) => [p.type, p.value])
  );
  return new Date(guess - (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - guess)).toISOString();
}

export async function saveCompetition(id: string, fd: FormData) {
  await requireAdmin();
  const { service, c } = await load(id);
  const p = phase(c);
  if (p !== "draft" && p !== "upcoming") go(id, "Entries have opened, so the terms are fixed.", "error");
  const dollars = Number(formText(fd, "prize_value", 12).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(dollars) || dollars < 0) go(id, "The prize's value is a number of dollars.", "error");
  // A draw over the permit threshold keeps everything else typed: it's saved as a skill competition and says why.
  const wantsDraw = formText(fd, "judging", 10) === "draw";
  const overLimit = wantsDraw && Math.round(dollars * 100) > DRAW_LIMIT_CENTS;
  const judging = wantsDraw && !overLimit ? "draw" : "skill";
  const slug = c.status === "draft" ? formText(fd, "slug", 80).toLowerCase() : c.slug;
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || slug === "confirm") go(id, "The address is lower-case letters, numbers and dashes.", "error");
  const winners = Number(formText(fd, "winner_count", 3));
  const { error } = await service
    .from("competitions")
    .update({
      title: formText(fd, "title", 120) || c.title,
      slug,
      summary: formText(fd, "summary", 400),
      question: formText(fd, "question", 300),
      prize: formText(fd, "prize", 200),
      prize_value_cents: Math.round(dollars * 100),
      judging,
      criteria: formText(fd, "criteria", 1000),
      who_can_enter: formText(fd, "who_can_enter", 400),
      opens_at: melbourne(formText(fd, "opens_at", 20)),
      closes_at: melbourne(formText(fd, "closes_at", 20)),
      winners_by: /^\d{4}-\d{2}-\d{2}$/.test(formText(fd, "winners_by", 10)) ? formText(fd, "winners_by", 10) : null,
      how_winners_told: formText(fd, "how_winners_told", 300),
      winner_count: Number.isInteger(winners) && winners >= 1 && winners <= 20 ? winners : 1,
      image_alt: formText(fd, "image_alt", 200),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) go(id, error.message.includes("draw_limit") ? "A random draw can't have more than $3,000 in prizes: make it a skill competition." : error.code === "23505" ? "That address is taken." : error.message, "error");
  refresh(slug);
  if (overLimit) go(id, `Saved as a skill competition: a random draw can't have more than ${money(DRAW_LIMIT_CENTS)} in prizes without a permit. Add the judging criteria.`, "error");
  go(id, "Saved.");
}

export async function publishCompetition(id: string) {
  await requireAdmin();
  const { service, c } = await load(id);
  const missing = missingForPublish(c, await getBusinessAbn());
  if (missing.length) go(id, `Before it can go public it needs ${missing.join("; ")}.`, "error");
  await service.from("competitions").update({ status: "published" }).eq("id", id);
  refresh(c.slug);
  go(id, "It's public.");
}

export async function unpublishCompetition(id: string) {
  await requireAdmin();
  const { service, c } = await load(id);
  const { count } = await service.from("competition_entries").select("id", { count: "exact", head: true }).eq("competition_id", id);
  if (count) go(id, "People have entered, so it stays public.", "error");
  await service.from("competitions").update({ status: "draft" }).eq("id", id);
  refresh(c.slug);
  go(id, "Back to a draft.");
}

export async function disqualifyEntry(competitionId: string, entryId: string, fd: FormData) {
  await requireAdmin();
  const reason = formText(fd, "reason", 200);
  const service = createServiceSupabase()!;
  await service.from("competition_entries").update({ disqualified: reason || null, ...(reason ? { winner_rank: null } : {}) }).eq("id", entryId).eq("competition_id", competitionId);
  go(competitionId, reason ? "Entry set aside, with the reason recorded." : "Entry counts again.");
}

export async function setWinnerRank(competitionId: string, entryId: string, fd: FormData) {
  await requireAdmin();
  const { service, c } = await load(competitionId);
  if (phase(c) !== "closed") go(competitionId, "Winners are chosen after entries close.", "error");
  const raw = formText(fd, "rank", 3);
  const rank = raw ? Number(raw) : null;
  if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > c.winner_count)) go(competitionId, `A place from 1 to ${c.winner_count}, or empty.`, "error");
  await service.from("competition_entries").update({ winner_rank: rank }).eq("id", entryId).eq("competition_id", competitionId).not("confirmed_at", "is", null).is("disqualified", null);
  go(competitionId, "Saved.");
}

/** A draw: every confirmed entry that hasn't been set aside has the same chance. */
export async function drawWinners(competitionId: string) {
  const { userId } = await requireAdmin();
  const { service, c } = await load(competitionId);
  if (c.judging !== "draw" || phase(c) !== "closed") go(competitionId, "Only a draw, and only after entries close.", "error");
  const { data } = await service.from("competition_entries").select("id").eq("competition_id", competitionId).not("confirmed_at", "is", null).is("disqualified", null);
  const pool = [...(data ?? [])];
  await service.from("competition_entries").update({ winner_rank: null }).eq("competition_id", competitionId);
  const picked: string[] = [];
  for (let i = 0; i < c.winner_count && pool.length; i++) picked.push(pool.splice(randomInt(pool.length), 1)[0].id as string);
  for (const [i, id] of picked.entries()) await service.from("competition_entries").update({ winner_rank: i + 1 }).eq("id", id);
  await service.from("competitions").update({ judging_note: `Drawn at random by the site from ${(data ?? []).length} confirmed entries on ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}.`, judged_by: userId }).eq("id", competitionId);
  go(competitionId, `Drew ${picked.length} from ${(data ?? []).length}.`);
}

export async function publishResult(competitionId: string, fd: FormData) {
  const { userId } = await requireAdmin();
  const { service, c } = await load(competitionId);
  if (phase(c) !== "closed") go(competitionId, "The result goes up after entries close.", "error");
  const note = formText(fd, "judging_note", 2000) || c.judging_note;
  if (!note.trim()) go(competitionId, "Write down how it was judged: who, and how they decided. It's the record.", "error");
  const { data: winners } = await service.from("competition_entries").select("id, name, email").eq("competition_id", competitionId).not("winner_rank", "is", null).order("winner_rank");
  if (!winners?.length) go(competitionId, "Choose the winners first.", "error");
  await service.from("competitions").update({ status: "judged", judged_at: new Date().toISOString(), judged_by: userId, judging_note: note }).eq("id", competitionId);
  const copy = await getContent("email.competition_winner");
  for (const w of winners!) {
    const vars = { first_name: String(w.name).split(" ")[0], competition: c.title, prize: c.prize, contact_email: CONTACT_EMAIL, competition_url: absoluteUrl(`/competitions/${c.slug}`) };
    await sendEmail({ to: w.email as string, subject: fillVariables(copy.subject, vars), text: fillVariables(copy.body, vars) });
  }
  refresh(c.slug);
  go(competitionId, `Result published, and ${winners!.length === 1 ? "the winner has" : `${winners!.length} winners have`} been emailed.`);
}

export async function uploadCompetitionImage(id: string, fd: FormData) {
  await requireAdmin();
  const file = fd.get("image") as File | null;
  if (!file || !file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const { service, c } = await load(id);
  const path = `competitions/${id}/${Date.now()}.${(file.name.split(".").pop() ?? "jpg").toLowerCase()}`;
  const { error } = await service.storage.from(MARKETING_FILES).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;
  await service.from("competitions").update({ image_path: path }).eq("id", id);
  if (c.image_path) await service.storage.from(MARKETING_FILES).remove([c.image_path]);
  refresh(c.slug);
  revalidatePath(`/admin/competitions/${id}`);
}

export async function removeCompetitionImage(id: string) {
  await requireAdmin();
  const { service, c } = await load(id);
  if (!c.image_path) return;
  await service.from("competitions").update({ image_path: null }).eq("id", id);
  await service.storage.from(MARKETING_FILES).remove([c.image_path]);
  refresh(c.slug);
  revalidatePath(`/admin/competitions/${id}`);
}
