import type { HistoryRow } from "@/lib/admin";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * The history list at the foot of every admin screen (§10): what changed,
 * who and when, newest first. Two people run this, and a change nobody
 * remembers making is the argument this is here to settle.
 */
export function HistoryList({ rows, empty = "No changes recorded yet." }: { rows: HistoryRow[]; empty?: string }) {
  return (
    <section className="border-t border-border pt-6" data-history>
      <h2 className="font-display text-[22px] leading-none text-ink">History</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[14px] text-subtle">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col text-[14px]">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 border-b border-border py-2">
              <span className="text-fg">{r.what}</span>
              {r.detail && <span className="text-muted">({r.detail})</span>}
              <span className="ml-auto text-[13px] text-subtle">
                {r.who ?? "the site"}, {when(r.when)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
