import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { addMonths, countWord, DEFAULTS, formatLongDate, SETTING_RANGES, type SettingKey } from "@/lib/settings";
import { saveSetting } from "./actions";
import Link from "next/link";

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
  const stored = (key: SettingKey) => settingRows?.find((r) => r.key === key)?.value ?? DEFAULTS[key];
  const launchRaw = stored("launch_date");
  const monthsRaw = stored("founding_free_months");
  const joinByRaw = stored("founding_join_by");
  const months = Number(monthsRaw) || Number(DEFAULTS.founding_free_months);
  const launch = launchRaw ? new Date(`${launchRaw}T00:00:00Z`) : null;
  const firstCharge = launch ? addMonths(launch, months) : null;
  const notice = (key: SettingKey) => (
    <>
      {saved === key && <p className="mt-3 rounded-[12px] bg-accent-soft px-3 py-2 text-sm text-fg">Saved.</p>}
      {error && errorKey === key && <p className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
    </>
  );
  const input = "w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 text-fg";

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-[26px] leading-none text-ink">Founding offer</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Founding members give their card at sign-up and aren&apos;t charged until {countWord(months)} months after launch.
          {firstCharge
            ? ` The site launched on ${formatLongDate(launch!)}, so the first charge date is ${formatLongDate(firstCharge)}.`
            : " There's no launch date yet, so /for-coaches says \"six months after we launch\" instead of a date."}{" "}
          Changes show on the site within a minute.
        </p>

        <div className="mt-5 flex flex-col gap-6">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Launch date</h3>
            {launch ? (
              <p className="mt-1 text-sm text-muted">
                <strong className="font-medium text-fg">{formatLongDate(launch)}</strong>. Locked: it can only be changed in the database.
              </p>
            ) : (
              <>
                <p className="mt-1 max-w-[62ch] text-sm text-muted">
                  Set this on launch day. It locks once saved, and every founding member&apos;s free period counts from it.
                </p>
                {notice("launch_date")}
                <form action={saveSetting} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="key" value="launch_date" />
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-fg">Launched on</span>
                    <input type="date" name="value" required className={input} />
                  </label>
                  <Button type="submit">Lock the launch date</Button>
                </form>
              </>
            )}
            {launch && notice("launch_date")}
          </div>

          <div>
            <h3 className="text-[15px] font-semibold text-fg">Free months after launch</h3>
            {notice("founding_free_months")}
            <form action={saveSetting} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="key" value="founding_free_months" />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">Months</span>
                <input type="number" name="value" min={1} max={24} required defaultValue={monthsRaw} className={input} />
              </label>
              <Button type="submit">Save</Button>
            </form>
          </div>

          <div>
            <h3 className="text-[15px] font-semibold text-fg">Last day to join as a founding member</h3>
            <p className="mt-1 text-sm text-muted">Leave empty to keep the offer open.</p>
            {notice("founding_join_by")}
            <form action={saveSetting} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="key" value="founding_join_by" />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">Join by</span>
                <input type="date" name="value" defaultValue={joinByRaw} className={input} />
              </label>
              <Button type="submit">Save</Button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Review</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          With review on, a finished profile waits in the review queue until one of you publishes it. With it off, it goes live straight away and you get an email saying who joined.
        </p>
        <div className="mt-5 flex flex-col gap-6">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Review new profiles</h3>
            {notice("review_required")}
            <form action={saveSetting} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="key" value="review_required" />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">Review</span>
                <select name="value" defaultValue={stored("review_required")} className={input}>
                  <option value="true">On: we look before it goes live</option>
                  <option value="false">Off: publish as soon as it&apos;s finished</option>
                </select>
              </label>
              <Button type="submit">Save</Button>
            </form>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Who gets the email</h3>
            <p className="mt-1 max-w-[62ch] text-sm text-muted">One or more addresses, separated by commas. Empty means nobody is told, so fill this in before launch.</p>
            {notice("review_alert_emails")}
            <form action={saveSetting} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="key" value="review_alert_emails" />
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-sm font-medium text-fg">Email addresses</span>
                <input name="value" defaultValue={stored("review_alert_emails")} className={input} />
              </label>
              <Button type="submit">Save</Button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-[26px] leading-none text-ink">Place pages, featured spots and event reach</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Counted per profession, so ten coaches in Geelong don&apos;t switch on a Geelong farriers page.
        </p>
        <div className="mt-5 flex flex-col gap-6">
          {(
            [
              ["area_page_min_providers", "Providers before a place gets its own page", "Below this, /farriers/in/ballarat-vic sends people to the farriers page instead. Saving re-checks every place straight away."],
              ["featured_min_providers", "Providers nearby before featured spots appear", "In a smaller area a featured spot isn't worth paying for, so none show."],
              ["featured_slots_per_area", "Featured spots per profession in one place", "Shown in a labelled block above the results, taking turns day to day. Never a place in the results themselves."],
              ["event_reach_km", "How far a Clinic plan's events are emailed, in km", "Other plans' events reach riders within each rider's own alert distance. Clinic events go this far."],
              ["benchmark_min_providers", "Providers in a profession before benchmarks show", "A comparison needs enough people in it to mean something and to keep any one of them anonymous."],
            ] as const
          ).map(([key, title, help]) => (
            <div key={key}>
              <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
              <p className="mt-1 max-w-[62ch] text-sm text-muted">{help}</p>
              {notice(key)}
              <form action={saveSetting} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="key" value={key} />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-fg">Number</span>
                  <input type="number" name="value" min={SETTING_RANGES[key][0]} max={SETTING_RANGES[key][1]} required defaultValue={stored(key)} className={input} />
                </label>
                <Button type="submit">Save</Button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <p className="border-t border-border pt-6 text-sm text-muted">
        Plan names, prices, their Stripe prices and what each plan includes are on the{" "}
        <Link href="/admin/plans" className="text-accent underline-offset-2 hover:underline">Plans and prices</Link> tab.
      </p>

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
                <div className="min-w-0 break-words">
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
