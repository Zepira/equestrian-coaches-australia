import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";
import { DEFAULTS, SETTING_RANGES } from "@/lib/settings";
import { computeAwards } from "@/lib/awards";
import { saveSetting } from "../settings/actions";
import { publishAwards, unpublishAwards } from "./actions";

export const metadata = { title: "Awards" };

/**
 * /admin/awards (stage F): the riders' choice result for a year, worked out
 * by the published rules, then published as it stands. Nobody picks.
 */
export default async function AdminAwardsPage({ searchParams }: { searchParams: Promise<{ year?: string; done?: string; error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const thisYear = new Date().getFullYear();
  const year = Number(sp.year) >= 2026 && Number(sp.year) <= thisYear ? Number(sp.year) : thisYear - 1 >= 2026 ? thisYear - 1 : thisYear;
  const [results, professions, { data: published }, { data: minRow }] = await Promise.all([
    computeAwards(service, year),
    getProfessions(),
    service.from("awards").select("id").eq("year", year),
    service.from("settings").select("value").eq("key", "riders_choice_min_reviews").maybeSingle(),
  ]);
  const name = (id: string) => professions.find((p) => p.id === id)?.name ?? "?";
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Riders&rsquo; choice</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Once a year, for each profession in each state, worked out from reviews and saves by the <Link href="/riders-choice" className="text-accent">published rules</Link>. Plans and payments never count. Check it, then publish it as it stands.
        </p>
      </div>
      {sp.done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{sp.done}</p>}
      {sp.error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{sp.error}</p>}
      <form className="flex items-end gap-2" method="get">
        <label><span className="mb-1 block text-[13px] font-medium text-fg">Year</span><input type="number" name="year" min={2026} max={thisYear} defaultValue={year} className={`${input} w-28`} /></label>
        <Button type="submit" variant="secondary">Work it out</Button>
      </form>
      <table className="w-full text-left text-[14px]" data-award-results>
        <thead className="text-[12.5px] text-subtle"><tr><th className="py-1">Profession</th><th>State</th><th>Winner</th><th>Average</th><th>Reviews</th><th>Saves</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={`${r.profession_id}${r.state}`} className="border-t border-border"><td className="py-1.5">{name(r.profession_id)}</td><td>{r.state}</td><td><Link href={`/profile/${r.slug}`} className="text-accent">{r.name}</Link></td><td>{r.average.toFixed(2)}</td><td>{r.reviews}</td><td>{r.saves}</td></tr>
          ))}
          {results.length === 0 && <tr><td colSpan={6} className="py-2 text-subtle">Nobody met the rules for {year}.</td></tr>}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3">
        {year < thisYear && results.length > 0 && <form action={publishAwards.bind(null, year)}><Button type="submit">{(published ?? []).length ? `Publish ${year} again` : `Publish ${year}`}</Button></form>}
        {(published ?? []).length > 0 && <form action={unpublishAwards.bind(null, year)}><Button type="submit" variant="secondary">Take {year} down</Button></form>}
        {year === thisYear && <p className="text-[13px] text-subtle">This year isn&rsquo;t over, so it can&rsquo;t be published yet.</p>}
      </div>
      <form action={saveSetting} className="flex items-end gap-2 border-t border-border pt-6">
        <input type="hidden" name="key" value="riders_choice_min_reviews" />
        <input type="hidden" name="back" value="/admin/awards" />
        <label><span className="mb-1 block text-[13px] font-medium text-fg">Fewest reviews in the year to be eligible</span>
          <input name="value" type="number" min={SETTING_RANGES.riders_choice_min_reviews[0]} max={SETTING_RANGES.riders_choice_min_reviews[1]} defaultValue={minRow?.value ?? DEFAULTS.riders_choice_min_reviews} className={`${input} w-24`} />
        </label>
        <Button type="submit" variant="secondary">Save</Button>
      </form>
    </div>
  );
}
