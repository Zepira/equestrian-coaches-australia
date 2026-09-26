import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { DEFAULTS, SETTING_RANGES } from "@/lib/settings";
import { ensureSequences, SEQUENCES, stepKey } from "@/lib/sequences";
import { getContent } from "@/lib/cms/read";
import { saveSetting } from "../settings/actions";
import { saveSteps, setSequenceActive } from "./actions";

export const metadata = { title: "Sequences" };

/**
 * /admin/sequences (The Marketing Engine M7, Grow): each sequence with its
 * switch, who's in it and why people left, and each step's wait, switch and
 * words (the words are edited on Emails).
 */
export default async function AdminSequencesPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string; saved?: string }> }) {
  const { done, error, saved } = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  await ensureSequences(service);
  const [{ data: seqRows }, { data: steps }, { data: runs }, { data: settingRows }] = await Promise.all([
    service.from("sequences").select("key, active, updated_at"),
    service.from("sequence_steps").select("sequence_key, position, delay_hours, active"),
    service.from("sequence_runs").select("sequence_key, stopped_at, stop_reason"),
    service.from("settings").select("key, value").in("key", ["onboarding_complete_pct", "quiet_rider_days", "pause_max_months"]),
  ]);
  // A step that acts instead of emailing (the quiet rider check's last step) has no words to show.
  const subjects = Object.fromEntries(
    await Promise.all(
      SEQUENCES.flatMap((s) =>
        s.delays.map(async (_, i) => [stepKey(s.key, i + 1), s.actions?.[i + 1] ? null : ((await getContent(stepKey(s.key, i + 1))) as { subject: string }).subject] as const)
      )
    )
  );
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Sequences</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Emails that go out over days after something happens, and stop when the job&rsquo;s done. What starts and stops each one is fixed; the waits, the switches and the words are yours. Each starts once per person, and only for things from the last two weeks, so switching one on never emails everyone who ever signed up. The ones that offer a plan only go to people who agreed to news for professionals; the rest are about the person&rsquo;s own account. Every email has a one-click stop, apart from the quiet rider check, where stopping would do the opposite of what the reader wants.
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      {saved && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Saved.</p>}

      {SEQUENCES.map((s) => {
        const row = seqRows?.find((r) => r.key === s.key);
        const mine = (runs ?? []).filter((r) => r.sequence_key === s.key);
        const running = mine.filter((r) => !r.stopped_at).length;
        const reasons = Object.entries(mine.filter((r) => r.stopped_at).reduce<Record<string, number>>((m, r) => ({ ...m, [r.stop_reason as string]: (m[r.stop_reason as string] ?? 0) + 1 }), {}));
        return (
          <section key={s.key} className="rounded-[16px] border border-border bg-surface p-4 @[560px]/admin:p-5" data-sequence={s.key}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-[22px] leading-none text-ink">{s.name}</h3>
                <p className="mt-1.5 text-[13.5px] text-muted">
                  To {s.to.toLowerCase()}. Starts: {s.starts.charAt(0).toLowerCase() + s.starts.slice(1)}. Stops: {s.stops.charAt(0).toLowerCase() + s.stops.slice(1)}.{s.purpose ? " Offers a plan, so only people who agreed to news get it, with the unsubscribe link." : ""}
                </p>
                <p className="mt-1 text-[13px] text-subtle" data-sequence-counts>
                  {running} in it now, {mine.length - running} finished or stopped{reasons.length ? ` (${reasons.map(([r, n]) => `${n} ${r}`).join(", ")})` : ""}.
                </p>
              </div>
              <form action={setSequenceActive.bind(null, s.key, !row?.active)} data-toggle>
                <Button type="submit" variant={row?.active ? "secondary" : "primary"}>{row?.active ? "Switch off" : "Switch on"}</Button>
              </form>
            </div>
            <p className={`mt-2 text-[13px] font-medium ${row?.active ? "text-success" : "text-subtle"}`}>{row?.active ? "On" : "Off"}</p>
            <form action={saveSteps.bind(null, s.key)} className="mt-3 flex flex-col gap-2">
              {s.delays.map((_, i) => {
                const st = steps?.find((x) => x.sequence_key === s.key && x.position === i + 1);
                const key = stepKey(s.key, i + 1);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 border-t border-border pt-2 text-[14px]">
                    <span className="w-14 text-subtle">Step {i + 1}</span>
                    <label className="flex items-center gap-2">
                      <input type="number" name={`delay_${i + 1}`} min={0} max={90} step={0.5} defaultValue={(st?.delay_hours ?? 0) / 24} className={`${input} w-20`} />
                      <span className="text-muted">days {i === 0 ? "after it starts" : "after the last"}</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" name={`active_${i + 1}`} defaultChecked={st?.active ?? true} /> send
                    </label>
                    {subjects[key] === null ? (
                      <span className="text-muted">No email: stops their alerts and round-up</span>
                    ) : (
                      <Link href={`/admin/emails/${key.slice(6)}`} className="text-accent">&ldquo;{subjects[key]}&rdquo;</Link>
                    )}
                  </div>
                );
              })}
              <div className="pt-1"><Button type="submit" variant="secondary">Save the steps</Button></div>
            </form>
          </section>
        );
      })}

      <section className="border-t border-border pt-6">
        <div className="flex flex-col gap-3">
          {(
            [
              ["onboarding_complete_pct", "\u201cNew profile\u201d stops once the profile is this complete (%)"],
              ["quiet_rider_days", "Ask a rider if they still want emails after this many quiet days"],
              ["pause_max_months", "The longest a professional can pause, in months"],
            ] as const
          ).map(([key, text]) => (
            <form key={key} action={saveSetting} className="flex items-end gap-2">
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="back" value="/admin/sequences" />
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-fg">{text}</span>
                <input name="value" type="number" min={SETTING_RANGES[key][0]} max={SETTING_RANGES[key][1]} defaultValue={settingRows?.find((r) => r.key === key)?.value ?? DEFAULTS[key]} className={`${input} w-24`} />
              </label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-subtle">
          The emails go out once a day while the site is on Vercel&rsquo;s free plan, and every hour once it&rsquo;s on Pro.
        </p>
      </section>
    </div>
  );
}
