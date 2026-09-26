import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { changeLog } from "@/lib/admin";
import { getBusinessAbn } from "@/lib/settings";
import { fileUrl, missingForPublish, money, phase, type Competition } from "@/lib/competitions";
import { HistoryList } from "../../history-list";
import { TermImagePanel } from "../../term-image-panel";
import {
  disqualifyEntry,
  drawWinners,
  publishCompetition,
  publishResult,
  removeCompetitionImage,
  saveCompetition,
  setWinnerRank,
  unpublishCompetition,
  uploadCompetitionImage,
} from "../actions";

export const metadata = { title: "Competition" };

/** "2026-11-01T09:00" for a datetime-local field, in Melbourne time. */
function localValue(iso: string | null) {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * One competition (M10): its terms as fields (fixed once entries open), what
 * it still needs before it can go public, its entries, and the judging.
 */
export default async function AdminCompetitionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { id } = await params;
  const { done, error } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const { data } = await service.from("competitions").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as Competition;
  const p = phase(c);
  const [abn, { data: entries }, history] = await Promise.all([
    getBusinessAbn(),
    service.from("competition_entries").select("*").eq("competition_id", id).order("created_at"),
    changeLog(service, { table: "competitions", rowIds: [id] }),
  ]);
  const missing = missingForPublish(c, abn);
  const locked = p !== "draft" && p !== "upcoming";
  const confirmed = (entries ?? []).filter((e) => e.confirmed_at);
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  const label = "mb-1 block text-[13px] font-medium text-fg";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[14px]"><Link href="/admin/competitions" className="text-accent">← Competitions</Link></p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] leading-none text-ink">{c.title}</h2>
          <p className="mt-1.5 text-[14px] text-muted" data-phase={p}>
            {p === "draft" ? <>Draft. <Link href={`/competitions/${c.slug}?preview=1`} className="text-accent">Preview the page</Link></> : <Link href={`/competitions/${c.slug}`} className="text-accent">/competitions/{c.slug}</Link>}
            {" · "}{confirmed.length} confirmed, {(entries ?? []).length - confirmed.length} not confirmed
          </p>
        </div>
        {c.status === "draft" ? (
          <form action={publishCompetition.bind(null, id)}><Button type="submit">Make it public</Button></form>
        ) : p === "upcoming" && !(entries ?? []).length ? (
          <form action={unpublishCompetition.bind(null, id)}><Button type="submit" variant="secondary">Back to a draft</Button></form>
        ) : null}
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      {c.status === "draft" && missing.length > 0 && (
        <p className="rounded-[12px] bg-shade px-3 py-2 text-[13.5px] text-muted" data-missing>Still needs: {missing.join("; ")}.</p>
      )}

      <div className="grid gap-6 @[760px]/admin:grid-cols-[1fr_320px]">
        <form action={saveCompetition.bind(null, id)} className="@container/editor" data-competition-form>
          <fieldset disabled={locked} className="flex flex-col gap-4">
            {locked && <p className="text-[13px] text-subtle">Entries have opened, so the terms are fixed.</p>}
            <div className="grid gap-4 @[460px]/editor:grid-cols-2">
              <label><span className={label}>Title</span><input name="title" defaultValue={c.title} className={input} /></label>
              <label><span className={label}>Address</span><input name="slug" defaultValue={c.slug} disabled={c.status !== "draft"} className={input} /></label>
            </div>
            <label><span className={label}>Summary</span><textarea name="summary" defaultValue={c.summary} rows={2} className={input} /></label>
            <label><span className={label}>The question entrants answer</span><input name="question" defaultValue={c.question} placeholder="In 25 words or fewer, what's the best thing your coach taught you?" className={input} /></label>
            <div className="grid gap-4 @[560px]/editor:grid-cols-[1fr_140px_110px]">
              <label><span className={label}>Prize</span><input name="prize" defaultValue={c.prize} className={input} /></label>
              <label><span className={label}>Total value ($)</span><input name="prize_value" defaultValue={c.prize_value_cents ? String(c.prize_value_cents / 100) : ""} inputMode="decimal" className={input} /></label>
              <label><span className={label}>Winners</span><input name="winner_count" type="number" min={1} max={20} defaultValue={c.winner_count} className={input} /></label>
            </div>
            <div className="grid gap-4 @[460px]/editor:grid-cols-2">
              <label><span className={label}>Judged by</span>
                <select name="judging" defaultValue={c.judging} className={input}>
                  <option value="skill">Skill, against published criteria</option>
                  <option value="draw">A random draw (up to $3,000 in prizes)</option>
                </select>
              </label>
              <label><span className={label}>Who can enter</span><input name="who_can_enter" defaultValue={c.who_can_enter} placeholder="Australian residents." className={input} /></label>
            </div>
            <label><span className={label}>Judging criteria (skill)</span><textarea name="criteria" defaultValue={c.criteria} rows={2} placeholder="Originality, and how well it shows what you learned." className={input} /></label>
            <div className="grid gap-4 @[640px]/editor:grid-cols-3">
              <label><span className={label}>Opens (Melbourne)</span><input type="datetime-local" name="opens_at" defaultValue={localValue(c.opens_at)} className={input} /></label>
              <label><span className={label}>Closes (Melbourne)</span><input type="datetime-local" name="closes_at" defaultValue={localValue(c.closes_at)} className={input} /></label>
              <label><span className={label}>Result by</span><input type="date" name="winners_by" defaultValue={c.winners_by ?? ""} className={input} /></label>
            </div>
            <label><span className={label}>How winners are told</span><input name="how_winners_told" defaultValue={c.how_winners_told} placeholder="By email, within two days of the judging." className={input} /></label>
            <label><span className={label}>Photo description</span><input name="image_alt" defaultValue={c.image_alt} className={input} /></label>
            <div><Button type="submit">Save</Button></div>
          </fieldset>
        </form>
        <TermImagePanel
          src={c.image_path ? fileUrl(service, c.image_path) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"}
          uploaded={Boolean(c.image_path)}
          placeholderLabel="No photo yet"
          note="Shown on the competition and in the list."
          upload={uploadCompetitionImage.bind(null, id)}
          remove={removeCompetitionImage.bind(null, id)}
        />
      </div>

      <section className="border-t border-border pt-6">
        <h3 className="font-display text-[20px] leading-none text-ink">Entries</h3>
        <p className="mt-1.5 text-[13px] text-subtle">Only confirmed entries count. Prize {money(c.prize_value_cents)}; {c.winner_count} {c.winner_count === 1 ? "winner" : "winners"}.</p>
        <ul className="mt-3 flex flex-col gap-2 text-[14px]" data-entries>
          {(entries ?? []).map((e) => (
            <li key={e.id} className={`rounded-[12px] border border-border bg-surface p-3 ${e.disqualified || !e.confirmed_at ? "opacity-60" : ""}`} data-entry={e.email}>
              <div className="flex flex-wrap gap-x-3 text-[13px] text-subtle">
                <strong className="text-fg">{e.name}</strong>
                <span>{e.email}</span>
                {e.state && <span>{e.state}</span>}
                <span>{when(e.created_at)}</span>
                <span>{e.confirmed_at ? "confirmed" : "not confirmed"}</span>
                {e.parent_name && <span>entered by {e.parent_name}</span>}
                {(e.flags as string[]).includes("same_device") && <span className="text-danger">another entry came from the same device</span>}
                {e.disqualified && <span className="text-danger">set aside: {e.disqualified}</span>}
                {e.winner_rank && <span className="font-medium text-accent">winner #{e.winner_rank}</span>}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-fg">{e.answer}</p>
              {p === "closed" && e.confirmed_at && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {c.judging === "skill" && !e.disqualified && (
                    <form action={setWinnerRank.bind(null, id, e.id)} className="flex items-center gap-1.5">
                      <input name="rank" type="number" min={1} max={c.winner_count} defaultValue={e.winner_rank ?? ""} aria-label="Place" className="w-16 rounded-[8px] border border-border px-2 py-1" />
                      <Button type="submit" variant="secondary">Set place</Button>
                    </form>
                  )}
                  <form action={disqualifyEntry.bind(null, id, e.id)} className="flex items-center gap-1.5">
                    <input name="reason" defaultValue={e.disqualified ?? ""} placeholder="Reason to set it aside" className="w-56 rounded-[8px] border border-border px-2 py-1" />
                    <Button type="submit" variant="secondary">{e.disqualified ? "Update" : "Set aside"}</Button>
                  </form>
                </div>
              )}
            </li>
          ))}
          {(entries ?? []).length === 0 && <li className="text-subtle">No entries yet.</li>}
        </ul>
      </section>

      {p === "closed" && (
        <section className="rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-judging>
          <h3 className="font-display text-[20px] leading-none text-ink">The result</h3>
          {c.judging === "draw" && (
            <form action={drawWinners.bind(null, id)} className="mt-3"><Button type="submit" variant="secondary">Draw {c.winner_count === 1 ? "the winner" : "the winners"}</Button></form>
          )}
          <form action={publishResult.bind(null, id)} className="mt-3 flex flex-col gap-2">
            <label><span className={label}>How it was judged (the record: who, and how they decided)</span><textarea name="judging_note" defaultValue={c.judging_note} rows={3} className={input} /></label>
            <div><Button type="submit">Publish the result and email the winners</Button></div>
          </form>
        </section>
      )}
      {p === "judged" && <p className="text-[14px] text-muted" data-judged>Judged {c.judged_at ? when(c.judged_at) : ""}. {c.judging_note}</p>}
      <HistoryList rows={history} />
    </div>
  );
}
