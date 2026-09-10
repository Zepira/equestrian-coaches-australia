import Link from "next/link";
import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";
import { getDisciplines } from "@/lib/supabase/queries";
import { canListClinics, clinicLimit } from "@/lib/tiers";
import { createClinic, deleteClinic } from "./actions";

export const metadata = { title: "Clinics" };
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const input = "w-full rounded-[12px] border border-border bg-surface px-3.5 py-[13px] text-[15px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none wide:px-4 wide:py-3.5 wide:text-[16px]";
const label = "mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle";

/**
 * Clinics (canvas: Dashboards › Clinics): cards with the date block, places
 * left, riders emailed, Edit / View page; "+ New clinic" jumps to the form.
 * Every paid plan can list; Listed is capped at one live clinic.
 */
export default async function ClinicsPage() {
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/clinics");
  const { supabase, userId, tier, status } = ctx;
  const allowed = canListClinics(tier, status);
  const limit = clinicLimit(tier);
  const disciplines = await getDisciplines(supabase);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: clinics }, { data: notified }] = await Promise.all([
    supabase.from("clinics").select("id, title, start_date, location_text, places_left").eq("coach_id", userId).order("start_date"),
    supabase.from("notifications_log").select("clinic_id"),
  ]);
  const emailed = new Map<string, number>();
  for (const n of notified ?? []) emailed.set(n.clinic_id, (emailed.get(n.clinic_id) ?? 0) + 1);
  const upcoming = (clinics ?? []).filter((c) => c.start_date >= today);
  const atLimit = Number.isFinite(limit) && upcoming.length >= limit;
  const note = !allowed
    ? "Clinics come with every paid plan — subscribe in Billing to list one. Riders in your area who follow your disciplines get an email when you post one."
    : tier === "listed"
      ? "Listed includes one live clinic at a time. Riders in your area who follow your disciplines get an email when you post one."
      : "Every clinic gets its own page and an email to riders nearby who follow your disciplines.";

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Clinics</h1>
          <p className="mt-2.5 hidden max-w-[60ch] text-[16px] leading-[1.5] text-muted wide:mt-3 wide:block">{note}</p>
        </div>
        {allowed && !atLimit && (
          <a href="#new-clinic" className="shrink-0 rounded-[var(--radius-pill)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-fg wide:px-5 wide:py-[13px] wide:text-[15px]">
            + New clinic
          </a>
        )}
      </div>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-muted wide:hidden">{note}</p>

      <div className="mt-[18px] flex flex-col gap-2.5 wide:mt-7 wide:grid wide:grid-cols-2 wide:gap-3.5">
        {(clinics ?? []).map((c) => {
          const d = new Date(c.start_date);
          const past = c.start_date < today;
          return (
            <div key={c.id} className={`grid grid-cols-[60px_1fr] gap-3.5 rounded-[14px] border border-border bg-surface p-3.5 wide:grid-cols-[68px_1fr] wide:gap-[18px] wide:rounded-[16px] wide:p-[18px] ${past ? "opacity-60" : ""}`} data-clinic>
              <span className="self-start rounded-[10px] bg-shade py-2 text-center wide:py-2.5">
                <span className="block font-display text-[26px] leading-none text-ink wide:text-[28px]">{d.getDate()}</span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">{MONTH_SHORT[d.getMonth()]}</span>
              </span>
              <div>
                <div className="font-display text-[20px] leading-[1.1] text-ink wide:text-[22px]">{c.title}</div>
                <div className="mt-[5px] text-[13px] text-subtle wide:text-[14px]">{c.location_text}</div>
                <div className="mt-2.5 flex gap-3.5 text-[13px] text-fg wide:mt-3 wide:gap-4 wide:text-[14px]">
                  {c.places_left != null && (
                    <span>
                      <strong className="font-medium text-ink">{c.places_left}</strong> places left
                    </span>
                  )}
                  <span>
                    <strong className="font-medium text-ink">{emailed.get(c.id) ?? 0}</strong> riders emailed
                  </span>
                </div>
                <div className="mt-2.5 flex gap-3 text-[13px] font-medium wide:mt-3 wide:gap-3.5 wide:text-[14px]">
                  <Link href={`/dashboard/clinics/${c.id}/edit`} className="text-accent">
                    Edit
                  </Link>
                  <Link href={`/clinics/${c.id}`} className="text-ink">
                    View page
                  </Link>
                  <form action={deleteClinic.bind(null, c.id)} className="ml-auto">
                    <button type="submit" className="text-subtle hover:text-danger">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {(clinics ?? []).length === 0 && (
          <p className="rounded-[14px] border border-dashed border-border p-6 text-center text-[14px] text-subtle wide:col-span-2">You haven&apos;t listed any clinics yet.</p>
        )}
      </div>

      {allowed && !atLimit ? (
        <section id="new-clinic" className="mt-8 scroll-mt-24 rounded-[16px] border border-border bg-surface p-[18px] wide:mt-10 wide:rounded-[18px] wide:p-6">
          <h2 className="text-[26px] leading-none text-ink wide:text-[28px]">List a new clinic</h2>
          <form action={createClinic} className="mt-4 flex flex-col gap-3.5">
            <label className="block">
              <span className={label}>Title</span>
              <input name="title" type="text" required placeholder="e.g. Test Riding Day — Preliminary to Elementary" className={input} />
            </label>
            <label className="block">
              <span className={label}>Description</span>
              <textarea name="description" rows={3} className={`${input} resize-none`} />
            </label>
            <div className="grid grid-cols-1 gap-3.5 wide:grid-cols-2">
              <label className="block">
                <span className={label}>Discipline</span>
                <select name="discipline_id" className={input}>
                  <option value="">Any discipline</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Location</span>
                <input name="location_text" type="text" required placeholder="e.g. Strathfieldsaye VIC" className={input} />
              </label>
              <label className="block">
                <span className={label}>Start date</span>
                <input name="start_date" type="date" required className={input} />
              </label>
              <label className="block">
                <span className={label}>End date (optional)</span>
                <input name="end_date" type="date" className={input} />
              </label>
              <label className="block">
                <span className={label}>Places</span>
                <input name="capacity" type="number" min={0} placeholder="e.g. 12" className={input} />
              </label>
            </div>
            <button type="submit" className="self-start rounded-[var(--radius-pill)] bg-accent px-6 py-3 text-[15px] font-semibold text-accent-fg">
              List clinic
            </button>
          </form>
        </section>
      ) : allowed && atLimit ? (
        <p className="mt-6 rounded-[14px] bg-shade p-4 text-[14px] leading-[1.5] text-muted">
          Listed includes one live clinic at a time. <Link href="/dashboard/billing" className="font-medium text-accent">Move up to Spotlight or Clinic</Link> for unlimited events — and back down after your clinic month.
        </p>
      ) : (
        <p className="mt-6 rounded-[14px] bg-shade p-4 text-[14px] leading-[1.5] text-muted">
          <Link href="/dashboard/billing" className="font-medium text-accent">Choose a plan</Link> to list clinics.
        </p>
      )}
    </div>
  );
}
