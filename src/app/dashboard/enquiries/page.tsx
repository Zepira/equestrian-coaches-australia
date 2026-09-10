import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";
import { EnquiryStatusButton } from "../enquiry-status-button";
import type { EnquiryStatus } from "../actions";

export const metadata = { title: "Enquiries" };

const WANT: Record<string, string> = { regular: "Regular lessons", one_off: "One-off", clinic: "Clinic" };

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/**
 * The inbox (canvas: Dashboards › Enquiries). Phones: a card per enquiry;
 * desktop: a table. Tapping the status cycles it — outcomes feed the
 * monthly email. "Reply by email" is a mailto (or tel: for a mobile).
 */
export default async function EnquiriesPage() {
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/enquiries");
  const { data: enquiries } = await ctx.supabase
    .from("enquiries")
    .select("id, rider_name, rider_contact, want, message, status, created_at")
    .eq("coach_id", ctx.userId)
    .order("created_at", { ascending: false });
  const rows = enquiries ?? [];
  const replyHref = (contact: string) => (contact.includes("@") ? `mailto:${contact}` : `tel:${contact.replace(/\s+/g, "")}`);

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      <h1 className="text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Enquiries</h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-muted wide:mt-3 wide:max-w-[60ch] wide:text-[16px]">
        <span className="wide:hidden">Tap</span>
        <span className="hidden wide:inline">Click</span> a status to change it. Outcomes feed your monthly email, so mark the ones that turned into lessons.
      </p>

      {rows.length === 0 && <p className="mt-6 rounded-[14px] border border-dashed border-border p-6 text-center text-[14px] text-subtle">No enquiries yet.</p>}

      {/* phones: cards */}
      <div className="mt-[18px] flex flex-col gap-2.5 wide:hidden">
        {rows.map((e) => (
          <div key={e.id} className="rounded-[14px] border border-border bg-surface p-4" data-enquiry>
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="font-display text-[22px] leading-none text-ink">{e.rider_name}</span>
              <span className="text-[12.5px] text-subtle">{when(e.created_at)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-[var(--radius-pill)] border border-border px-2.5 py-1 text-[12px] font-medium text-muted">{WANT[e.want] ?? e.want}</span>
              <span className="rounded-[var(--radius-pill)] border border-border px-2.5 py-1 text-[12px] font-medium text-muted">{e.rider_contact}</span>
            </div>
            <p className="mt-3 text-[14.5px] leading-[1.5] text-fg">{e.message}</p>
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <a href={replyHref(e.rider_contact)} className="rounded-[var(--radius-pill)] border border-ink px-3.5 py-2 text-[14px] font-medium text-ink">
                {e.rider_contact.includes("@") ? "Reply by email" : "Call back"}
              </a>
              <EnquiryStatusButton id={e.id} status={e.status as EnquiryStatus} />
            </div>
          </div>
        ))}
      </div>

      {/* desktop: table */}
      {rows.length > 0 && (
        <div className="mt-7 hidden overflow-hidden rounded-[18px] border border-border bg-surface wide:block" role="table" aria-label="Enquiries">
          <div className="grid grid-cols-[180px_1fr_140px_130px_150px] gap-4 bg-shade px-6 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle" role="row">
            <span role="columnheader">Rider</span>
            <span role="columnheader">Message</span>
            <span role="columnheader">Wants</span>
            <span role="columnheader">Received</span>
            <span role="columnheader">Status</span>
          </div>
          {rows.map((e) => (
            <div key={e.id} className="grid grid-cols-[180px_1fr_140px_130px_150px] items-center gap-4 border-t border-shade px-6 py-[18px]" role="row" data-enquiry>
              <div role="cell">
                <div className="font-display text-[20px] leading-none text-ink">{e.rider_name}</div>
                <a href={replyHref(e.rider_contact)} className="mt-1 block truncate text-[12.5px] text-subtle hover:text-accent">
                  {e.rider_contact}
                </a>
              </div>
              <p role="cell" className="m-0 text-[14.5px] leading-[1.5] text-fg">{e.message}</p>
              <span role="cell" className="text-[14px] text-muted">{WANT[e.want] ?? e.want}</span>
              <span role="cell" className="text-[13.5px] text-subtle">{when(e.created_at)}</span>
              <span role="cell" className="justify-self-start">
                <EnquiryStatusButton id={e.id} status={e.status as EnquiryStatus} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
