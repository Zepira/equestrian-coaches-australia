import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { changeLog } from "@/lib/admin";
import { getProfessions } from "@/lib/cms/read";
import { titleCase } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { HistoryList } from "../history-list";
import { removeRider } from "./actions";

export const metadata = { title: "Riders" };

/** Postcode → state. ACT's 26xx and 29xx sit inside the NSW ranges and are counted there. */
const stateOf = (postcode: string | null) => {
  const d = (postcode ?? "").trim()[0];
  return ({ "0": "NT", "2": "NSW", "3": "VIC", "4": "QLD", "5": "SA", "6": "WA", "7": "TAS" } as Record<string, string>)[d] ?? "Unknown";
};

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <div className="font-display text-[34px] leading-none text-ink">{n}</div>
      <div className="mt-1 text-[13px] text-subtle">{label}</div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-[14px] text-subtle">None yet.</p>
      ) : (
        <ul className="mt-2 text-[14px]">
          {rows.map(([k, n]) => (
            <li key={k} className="flex justify-between border-b border-border py-1.5">
              <span className="text-fg">{k}</span>
              <span className="tabular-nums text-muted">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * /admin/riders (§10): how many riders and horse owners there are, where
 * their alerts point and what they follow, how many have unsubscribed, and
 * removing someone who asks. Counts only: no list of names or emails, since
 * nothing here needs one.
 */
export default async function AdminRidersPage({ searchParams }: { searchParams: Promise<{ removed?: string; error?: string }> }) {
  const { removed, error } = await searchParams;
  const supabase = await createClient();
  const service = createServiceSupabase();
  if (!supabase || !service) return <p className="text-[14px] text-muted">The service key isn&rsquo;t set, so there&rsquo;s nothing to count.</p>;

  const [{ count: riders }, { data: alerts }, { count: favourites }, professions, history] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "rider"),
    service.from("rider_alerts").select("rider_id, suburb, postcode, door, profession_ids, unsubscribed_at, wants_events, wants_new_providers"),
    service.from("favourites").select("rider_id", { count: "exact", head: true }),
    getProfessions(),
    changeLog(supabase, { table: "riders" }),
  ]);
  const list = alerts ?? [];
  const live = list.filter((a) => !a.unsubscribed_at);
  const withAlerts = new Set(live.map((a) => a.rider_id)).size;
  const unsubscribed = list.length - live.length;
  const tally = (keys: string[]) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byState = tally(live.map((a) => stateOf(a.postcode)));
  const bySuburb = tally(live.filter((a) => a.suburb).map((a) => titleCase(String(a.suburb)))).slice(0, 10);
  const byWho = tally(
    live.flatMap((a) => {
      const ids = (a.profession_ids as string[]) ?? [];
      if (ids.length) return ids.map((id) => professions.find((p) => p.id === id)?.name ?? "A removed profession");
      return [a.door === "coaches" ? "All coaches" : a.door === "horse_care" ? "All horse care" : "Everyone"];
    })
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Riders and horse owners</h2>
        <p className="mt-1.5 text-[14px] text-muted">Counts from their accounts and alerts. An alert counts once for each profession it follows.</p>
      </div>
      <div className="grid gap-3 @[880px]/admin:grid-cols-4" data-rider-counts>
        <Stat n={riders ?? 0} label="accounts" />
        <Stat n={withAlerts} label="with an alert on" />
        <Stat n={unsubscribed} label="alerts unsubscribed" />
        <Stat n={favourites ?? 0} label="saved profiles" />
      </div>
      <div className="grid gap-6 @[760px]/admin:grid-cols-3">
        <Table title="What they follow" rows={byWho} />
        <Table title="By state" rows={byState} />
        <Table title="Top places" rows={bySuburb} />
      </div>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[22px] leading-none text-ink">Remove someone who asks</h2>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Deletes their account, alerts and saved profiles for good. It can&rsquo;t be undone. Riders and horse owners only.
        </p>
        {removed && <p role="status" className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{removed}</p>}
        {error && <p role="alert" className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
        <form action={removeRider} className="mt-3 grid gap-3 @[560px]/admin:grid-cols-[1fr_1fr_auto] @[560px]/admin:items-end">
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Their email</span>
            <input name="email" type="email" required autoComplete="off" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-fg" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-fg">Type it again</span>
            <input name="confirm" type="email" required autoComplete="off" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-fg" />
          </label>
          <Button type="submit">Remove</Button>
        </form>
      </section>

      <HistoryList rows={history.map((h) => ({ ...h, what: "Removed a rider, on request", detail: undefined }))} empty="Nobody removed yet." />
    </div>
  );
}
