import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getProfessions } from "@/lib/cms/read";
import { changeLog } from "@/lib/admin";
import { PLACEMENTS, slotImage, sponsorReport, type Placement } from "@/lib/sponsors";
import { HistoryList } from "../../history-list";
import { TermImagePanel } from "../../term-image-panel";
import { createSlot, removeSlotImage, saveSponsor, updateSlot, uploadSlotImage } from "../actions";

export const metadata = { title: "Sponsor" };

type SlotRow = {
  id: string;
  placement: Placement;
  guide_id: string | null;
  profession_id: string | null;
  area_id: string | null;
  headline: string;
  body: string;
  link_label: string;
  image_path: string | null;
  starts_on: string;
  ends_on: string;
  active: boolean;
  links: { slug: string; destination: string } | null;
  areas: { name: string } | null;
};

/**
 * One sponsor (M11): their details, each slot with its dates, place, words
 * and picture, a form to book another, and the monthly report (on screen and
 * as a CSV to send them).
 */
export default async function AdminSponsorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string; month?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const service = createServiceSupabase();
  if (!service) return null;
  const { data: sponsor } = await service.from("sponsors").select("*").eq("id", id).maybeSingle();
  if (!sponsor) notFound();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" }).slice(0, 7);
  const [{ data: slots }, { data: guides }, professions, report, history] = await Promise.all([
    service.from("sponsor_slots").select("*, links(slug, destination), areas(name)").eq("sponsor_id", id).order("starts_on", { ascending: false }),
    service.from("guides").select("id, title").eq("status", "published").order("title"),
    getProfessions(),
    sponsorReport(service, id, month),
    changeLog(service, { table: ["sponsors", "sponsor_slots"], rowIds: [id] }),
  ]);
  const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";
  const label = "mb-1 block text-[13px] font-medium text-fg";

  const slotForm = (s: SlotRow | null) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className={label}>Where it shows</span>
        <select name="placement" defaultValue={s?.placement ?? "newsletter"} className={input}>
          {Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label><span className={label}>Which one (guides and professions; empty for all)</span>
        <select name="target" defaultValue={s?.guide_id ?? s?.profession_id ?? ""} className={input}>
          <option value="">All of them</option>
          <optgroup label="Guides">{(guides ?? []).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</optgroup>
          <optgroup label="Professions">{professions.filter((p) => p.id).map((p) => <option key={p.id} value={p.id!}>{p.name}</option>)}</optgroup>
        </select>
      </label>
      <label><span className={label}>Area (area pages; empty for all)</span><input name="area" defaultValue={s?.areas?.name ?? ""} placeholder="Bendigo" className={input} /></label>
      <label><span className={label}>Their link (https://)</span><input name="url" defaultValue={s?.links?.destination ?? sponsor.website} className={input} /></label>
      <label className="sm:col-span-2"><span className={label}>Headline</span><input name="headline" defaultValue={s?.headline ?? ""} maxLength={90} className={input} /></label>
      <label className="sm:col-span-2"><span className={label}>A line or two (up to 300)</span><textarea name="body" defaultValue={s?.body ?? ""} maxLength={300} rows={2} className={input} /></label>
      <label><span className={label}>Link words</span><input name="link_label" defaultValue={s?.link_label ?? "Find out more"} maxLength={40} className={input} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label><span className={label}>First day</span><input type="date" name="starts_on" defaultValue={s?.starts_on ?? ""} className={input} /></label>
        <label><span className={label}>Last day</span><input type="date" name="ends_on" defaultValue={s?.ends_on ?? ""} className={input} /></label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[14px]"><Link href="/admin/sponsors" className="text-accent">← Sponsors</Link></p>
      <h2 className="font-display text-[26px] leading-none text-ink">{sponsor.name}</h2>
      {sp.done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{sp.done}</p>}
      {sp.error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{sp.error}</p>}

      <form action={saveSponsor.bind(null, id)} className="grid max-w-[760px] gap-3 sm:grid-cols-2">
        <label><span className={label}>Name</span><input name="name" defaultValue={sponsor.name} className={input} /></label>
        <label><span className={label}>Website</span><input name="website" defaultValue={sponsor.website} placeholder="https://" className={input} /></label>
        <label><span className={label}>Who to send the report to</span><input name="contact_email" defaultValue={sponsor.contact_email} className={input} /></label>
        <label><span className={label}>Notes (the package, the price)</span><input name="notes" defaultValue={sponsor.notes} className={input} /></label>
        <div><Button type="submit" variant="secondary">Save</Button></div>
      </form>

      <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-report>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-[20px] leading-none text-ink">Report</h3>
          <form className="flex items-end gap-2" method="get">
            <input type="month" name="month" defaultValue={month} className={input} aria-label="Month" />
            <Button type="submit" variant="secondary">Show</Button>
            <a href={`/admin/sponsors/${id}/report?month=${month}`} className="text-[14px] font-medium text-accent">Download CSV</a>
          </form>
        </div>
        <table className="mt-3 w-full text-left text-[14px]">
          <thead className="text-[12.5px] text-subtle"><tr><th className="py-1">Where</th><th>Headline</th><th>Dates</th><th>Shown</th><th>Clicks</th></tr></thead>
          <tbody>
            {report.map((r) => (
              <tr key={r.id} className="border-t border-border" data-report-row={r.id}><td className="py-1.5">{r.where}</td><td>{r.headline}</td><td>{r.dates}</td><td>{r.views}</td><td>{r.clicks}</td></tr>
            ))}
            {report.length === 0 && <tr><td colSpan={5} className="py-2 text-subtle">No slots yet.</td></tr>}
          </tbody>
        </table>
        <p className="mt-2 text-[12.5px] text-subtle">Shown counts every page view and every round-up email that carried the slot; clicks count once per visitor a day.</p>
      </section>

      {((slots ?? []) as SlotRow[]).map((s) => (
        <section key={s.id} className="rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-slot={s.id}>
          <div className="grid gap-4 wide:grid-cols-[1fr_280px]">
            <form action={updateSlot.bind(null, id, s.id)} className="flex flex-col gap-3">
              {slotForm(s)}
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="active" defaultChecked={s.active} /> Running (untick to stop it early)</label>
              <p className="text-[12.5px] text-subtle">Tracked link: /go/{s.links?.slug}</p>
              <div><Button type="submit" variant="secondary">Save the slot</Button></div>
            </form>
            <TermImagePanel
              src={s.image_path ? slotImage(service, s.image_path) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"}
              uploaded={Boolean(s.image_path)}
              placeholderLabel="No picture"
              note="Optional. Shown on pages, not in emails."
              upload={uploadSlotImage.bind(null, id, s.id)}
              remove={removeSlotImage.bind(null, id, s.id)}
            />
          </div>
        </section>
      ))}

      <section className="rounded-[16px] border border-dashed border-border p-4 sm:p-5">
        <h3 className="font-display text-[20px] leading-none text-ink">Book a slot</h3>
        <form action={createSlot.bind(null, id)} className="mt-3 flex flex-col gap-3" data-new-slot>
          {slotForm(null)}
          <div><Button type="submit">Book it</Button></div>
        </form>
      </section>
      <HistoryList rows={history} />
    </div>
  );
}
