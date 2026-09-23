import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS, formatLongDate } from "@/lib/settings";
import { saveSetting } from "./actions";

export const metadata = { title: "Settings" };

type HistoryRow = {
  id: number;
  key: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
  changed_by: string | null;
  profiles: { name: string | null } | null;
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; key?: string }>;
}) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { saved, error, key: errorKey } = await searchParams;

  // Read the table, not the cached accessor: an admin should always see what
  // is actually stored, even inside the cache's TTL.
  const [{ data: settingRows }, { data: historyRows }] = await Promise.all([
    supabase.from("settings").select("key, value"),
    supabase
      .from("settings_history")
      .select("id, key, old_value, new_value, changed_at, changed_by, profiles(name)")
      .order("changed_at", { ascending: false })
      .limit(30),
  ]);
  const history = (historyRows ?? []) as unknown as HistoryRow[];
  const foundingRaw = settingRows?.find((r) => r.key === "founding_offer_ends")?.value ?? DEFAULTS.founding_offer_ends;
  const foundingEnds = new Date(`${foundingRaw}T00:00:00Z`);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-[26px] leading-none text-ink">Founding offer</h2>
        <p className="mt-1 text-sm text-muted">
          The last day a coach can sign up as a founding coach. Printed on /for-coaches as
          &ldquo;Free until {formatLongDate(foundingEnds)}&rdquo;. Changes show on the site within a
          minute.
        </p>

        {saved === "founding_offer_ends" && (
          <p className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-sm text-fg">Saved.</p>
        )}
        {error && errorKey === "founding_offer_ends" && (
          <p className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <form action={saveSetting} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="key" value="founding_offer_ends" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Offer ends</span>
            <input
              type="date"
              name="value"
              required
              defaultValue={foundingRaw}
              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg"
            />
          </label>
          <Button type="submit">Save</Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Default if the row is ever missing: {DEFAULTS.founding_offer_ends}.
        </p>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">History</h2>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No changes yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[14px] border border-border bg-surface px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-fg">{h.key}</span>
                  <span className="text-muted">
                    {" "}
                    {h.old_value ?? "(unset)"} → {h.new_value}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {h.profiles?.name ?? (h.changed_by ? "an admin" : "migration")} ·{" "}
                  {new Intl.DateTimeFormat("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Australia/Melbourne",
                  }).format(new Date(h.changed_at))}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
