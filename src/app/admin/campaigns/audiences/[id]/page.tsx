import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { resolveLocation } from "@/lib/supabase/queries";
import { getProfessions } from "@/lib/cms/read";
import { audienceCount, describeFilter, parseFilter, type AudienceFilter } from "@/lib/campaigns";
import { deleteAudience, saveAudience } from "../../actions";

export const metadata = { title: "Audience" };

/**
 * One audience: dropdowns only. "Check the count" shows the numbers for the
 * choices on screen without saving them; Save keeps them.
 */
export default async function AudiencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const { data: a } = await service.from("audiences").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const checking = sp.check === "1";
  let f: AudienceFilter = checking ? parseFilter(new URLSearchParams(sp)) : (a.filter as AudienceFilter);
  let placeError = "";
  if (checking && f.place) {
    const where = await resolveLocation(service, f.place);
    if (where) f = { ...f, lat: where.lat, long: where.long };
    else placeError = `We couldn't find "${f.place}".`;
  }
  const [count, words, professions, { data: sources }] = await Promise.all([
    placeError ? Promise.resolve(null) : audienceCount(service, f),
    describeFilter(f),
    getProfessions(),
    service.from("contacts").select("first_touch").not("first_touch", "is", null).limit(1000),
  ]);
  const sourceList = [...new Set((sources ?? []).map((s) => (s.first_touch as { source?: string } | null)?.source).filter((x): x is string => Boolean(x)))].sort();
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  const label = "mb-1 block text-[13px] font-medium text-fg";
  const name = checking ? sp.name ?? a.name : a.name;

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <p className="text-[14px]"><Link href="/admin/campaigns" className="text-accent">← Campaigns</Link></p>
      <h2 className="font-display text-[26px] leading-none text-ink">{a.name}</h2>
      {sp.done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{sp.done}</p>}
      {(sp.error || placeError) && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{sp.error || placeError}</p>}
      <div className="rounded-[14px] bg-shade p-4" data-audience-count>
        <p className="text-[15px] text-fg">{words}</p>
        {count && (
          <p className="mt-1 text-[14px] text-muted">
            <strong className="text-fg">{count.sendable}</strong> can be emailed, of {count.matched} who match. The rest haven&rsquo;t agreed to {f.who === "providers" ? "news for professionals" : "the rider round-up"} or have asked us to stop.
            {checking && " (Not saved yet.)"}
          </p>
        )}
      </div>

      <form action={saveAudience.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="check" value="1" />
        <label className="sm:col-span-2"><span className={label}>Name</span><input name="name" defaultValue={name} required className={input} /></label>
        <label><span className={label}>Who</span>
          <select name="who" defaultValue={f.who} className={input}>
            <option value="riders">Riders and horse owners</option>
            <option value="providers">Live professionals</option>
          </select>
        </label>
        <label><span className={label}>Side of the site</span>
          <select name="door" defaultValue={f.door ?? ""} className={input}>
            <option value="">Both</option>
            <option value="coaches">Coaching</option>
            <option value="horse_care">Horse care</option>
          </select>
        </label>
        <label><span className={label}>Profession</span>
          <select name="profession_id" defaultValue={f.profession_id ?? ""} className={input}>
            <option value="">Any</option>
            {professions.filter((p) => p.id).map((p) => (
              <option key={p.id} value={p.id!}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <label><span className={label}>Near (suburb or postcode)</span><input name="place" defaultValue={f.place ?? ""} className={input} /></label>
          <label><span className={label}>Within</span>
            <select name="km" defaultValue={String(f.km ?? 50)} className={input}>
              {[10, 25, 50, 100, 250].map((k) => <option key={k} value={k}>{k} km</option>)}
            </select>
          </label>
        </div>
        <label><span className={label}>Plan (professionals)</span>
          <select name="tier" defaultValue={f.tier ?? ""} className={input}>
            <option value="">Any</option><option value="listed">Listed</option><option value="spotlight">Spotlight</option><option value="clinic">Clinic</option>
          </select>
        </label>
        <label><span className={label}>Cohort (professionals)</span>
          <select name="cohort" defaultValue={f.cohort ?? ""} className={input}>
            <option value="">Any</option><option value="founding">Founding members</option><option value="open">Joined after the founding offer</option>
          </select>
        </label>
        <label><span className={label}>Where they came from</span>
          <select name="source" defaultValue={f.source ?? ""} className={input}>
            <option value="">Anywhere</option>
            {sourceList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label><span className={label}>Clicked an email in the last</span>
          <select name="clicked_days" defaultValue={String(f.clicked_days ?? "")} className={input}>
            <option value="">Doesn&rsquo;t matter</option><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option>
          </select>
        </label>
        <label><span className={label}>Joined from</span><input type="date" name="joined_from" defaultValue={f.joined_from ?? ""} className={input} /></label>
        <label><span className={label}>Joined up to</span><input type="date" name="joined_to" defaultValue={f.joined_to ?? ""} className={input} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">Save</Button>
          <Button type="submit" variant="secondary" formAction={`/admin/campaigns/audiences/${id}`} formMethod="get">Check the count</Button>
        </div>
      </form>
      <form action={deleteAudience.bind(null, id)} className="border-t border-border pt-4">
        <button className="text-[13px] text-subtle hover:text-danger">Delete this audience</button>
      </form>
    </div>
  );
}
