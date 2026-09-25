import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/profile-reviews";
import { createServiceSupabase } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { whoNames } from "@/lib/admin";
import { DEFAULTS, SETTING_RANGES } from "@/lib/settings";
import { FLAG_LABELS, REMOVAL_REASONS, REPORT_REASONS } from "@/lib/reviews";
import { profilePath } from "@/lib/page-paths";
import { saveSetting } from "../settings/actions";
import { adminPublishReview, adminRemoveReview, dismissReport } from "./actions";

export const metadata = { title: "Reviews" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const ACTION: Record<string, string> = { publish: "Published", remove: "Taken down", restore: "Put back", report_dismissed: "Report closed, kept", report_upheld: "Report upheld" };

type Row = {
  id: string;
  author_name: string;
  author_email: string;
  rating: number;
  body: string;
  source: string;
  status: string;
  flags: string[];
  removal_reason: string | null;
  created_at: string;
  confirmed_at: string | null;
  provider_reply: string | null;
  providers: { name: string; slug: string } | null;
};

/**
 * /admin/reviews (The Marketing Engine M5, Grow): waiting reviews, readers'
 * reports, what's up and what came down, and the log of every decision.
 * Removal takes a reason from the published policy and nothing else.
 */
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string; saved?: string }> }) {
  const { done, error, saved } = await searchParams;
  const supabase = await createClient();
  const service = createServiceSupabase();
  if (!supabase || !service) return null;
  const cols = "id, author_name, author_email, rating, body, source, status, flags, removal_reason, created_at, confirmed_at, provider_reply, providers(name, slug)";
  const [{ data: waiting }, { data: reports }, { data: recent }, { data: removed }, { data: log }, { data: settingRows }, { count: unconfirmed }] = await Promise.all([
    service.from("reviews").select(cols).eq("status", "pending").order("created_at"),
    service.from("review_reports").select("id, reason, detail, reporter_email, created_at, review_id").is("resolved_at", null).order("created_at"),
    service.from("reviews").select(cols).eq("status", "published").order("published_at", { ascending: false }).limit(30),
    service.from("reviews").select(cols).eq("status", "removed").order("created_at", { ascending: false }).limit(30),
    service.from("review_moderation_log").select("action, reason, note, created_by, created_at, reviews(author_name, providers(name))").order("created_at", { ascending: false }).limit(40),
    service.from("settings").select("key, value").in("key", ["reviews_hold_all", "enquiry_followup_days"]),
    service.from("reviews").select("id", { count: "exact", head: true }).eq("status", "unconfirmed"),
  ]);
  const reportedIds = [...new Set((reports ?? []).map((r) => r.review_id as string))];
  const { data: reported } = reportedIds.length ? await service.from("reviews").select(cols).in("id", reportedIds) : { data: [] };
  const byId = new Map(((reported ?? []) as unknown as Row[]).map((r) => [r.id, r]));
  const names = await whoNames(supabase, (log ?? []).map((l) => l.created_by as string | null));
  const setting = (k: "reviews_hold_all" | "enquiry_followup_days") => settingRows?.find((r) => r.key === k)?.value ?? DEFAULTS[k];
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  const removeForm = (id: string) => (
    <form action={adminRemoveReview.bind(null, id)} className="flex flex-wrap items-center gap-2">
      <select name="reason" required defaultValue="" className={input} aria-label="Why it breaks the policy">
        <option value="" disabled>Take down because…</option>
        {Object.entries(REMOVAL_REASONS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <input name="note" placeholder="Note for the log (optional)" className={`${input} w-56`} />
      <Button type="submit" variant="secondary">Take down</Button>
    </form>
  );
  const reviewCard = (r: Row, extra?: React.ReactNode) => (
    <li key={r.id} className="rounded-[14px] border border-border bg-surface p-4" data-admin-review={r.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <Stars rating={r.rating} />
        <span className="font-medium text-fg">{r.author_name}</span>
        <span className="text-subtle">{r.author_email}</span>
        <span className="text-subtle">
          on {r.providers ? <Link href={profilePath(r.providers.slug)} className="text-accent">{r.providers.name}</Link> : "?"}
        </span>
        <span className="text-subtle">· {r.source === "enquiry" ? "after an enquiry through us" : "from their review link"} · {when(r.created_at)}</span>
      </div>
      {r.flags.length > 0 && (
        <p className="mt-1.5 text-[13px] text-danger">Held: {r.flags.map((f) => FLAG_LABELS[f] ?? f).join("; ")}.</p>
      )}
      {r.removal_reason && <p className="mt-1.5 text-[13px] text-subtle">Taken down: {REMOVAL_REASONS[r.removal_reason as keyof typeof REMOVAL_REASONS]}</p>}
      <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.5] text-fg">{r.body}</p>
      {r.provider_reply && <p className="mt-2 rounded-[10px] bg-shade p-2.5 text-[13.5px] text-muted">Reply: {r.provider_reply}</p>}
      {extra && <div className="mt-3 flex flex-wrap items-center gap-3">{extra}</div>}
    </li>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] leading-none text-ink">Reviews</h2>
        <p className="mt-1.5 max-w-[66ch] text-[14px] text-muted">
          Every genuine review goes up, bad ones too. One comes down only for a reason in the{" "}
          <Link href="/review-policy" className="text-accent">review policy</Link>, and every decision is logged. Paying for a plan changes nothing here.
          {unconfirmed ? ` ${unconfirmed} more ${unconfirmed === 1 ? "is" : "are"} waiting for the reviewer to confirm their email.` : ""}
        </p>
      </div>
      {done && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">{done}</p>}
      {error && <p role="alert" className="rounded-[12px] bg-danger/10 px-3 py-2 text-[14px] text-danger">{error}</p>}
      {saved && <p role="status" className="rounded-[12px] bg-accent-soft px-3 py-2 text-[14px] text-fg">Saved.</p>}

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Waiting ({(waiting ?? []).length})</h3>
        <ul className="mt-3 flex flex-col gap-2.5" data-waiting>
          {((waiting ?? []) as unknown as Row[]).map((r) =>
            reviewCard(
              r,
              <>
                <form action={adminPublishReview.bind(null, r.id)}>
                  <Button type="submit">Publish</Button>
                </form>
                {removeForm(r.id)}
              </>
            )
          )}
          {(waiting ?? []).length === 0 && <li className="text-[14px] text-subtle">Nothing waiting.</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Reports ({(reports ?? []).length})</h3>
        <ul className="mt-3 flex flex-col gap-2.5" data-reports>
          {(reports ?? []).map((rep) => {
            const r = byId.get(rep.review_id as string);
            return (
              <li key={rep.id} className="rounded-[14px] border border-danger/30 bg-surface p-4" data-report={rep.id}>
                <p className="text-[13.5px] text-fg">
                  Reported as <strong>{REPORT_REASONS[rep.reason as keyof typeof REPORT_REASONS] ?? rep.reason}</strong> on {when(rep.created_at)}
                  {rep.reporter_email ? ` by ${rep.reporter_email}` : ""}.
                </p>
                {rep.detail && <p className="mt-1 text-[13.5px] text-muted">&ldquo;{rep.detail}&rdquo;</p>}
                {r && <ul className="mt-2.5">{reviewCard(r)}</ul>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {r && r.status === "published" && removeForm(r.id)}
                  <form action={dismissReport.bind(null, rep.id)} className="flex items-center gap-2">
                    <input name="note" placeholder="Why it stays (for the log)" className={`${input} w-56`} />
                    <Button type="submit" variant="secondary">Keep the review</Button>
                  </form>
                </div>
              </li>
            );
          })}
          {(reports ?? []).length === 0 && <li className="text-[14px] text-subtle">No open reports.</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-[20px] leading-none text-ink">Published, latest 30</h3>
        <ul className="mt-3 flex flex-col gap-2.5" data-published>
          {((recent ?? []) as unknown as Row[]).map((r) => reviewCard(r, removeForm(r.id)))}
          {(recent ?? []).length === 0 && <li className="text-[14px] text-subtle">None yet.</li>}
        </ul>
      </section>

      {(removed ?? []).length > 0 && (
        <section>
          <h3 className="font-display text-[20px] leading-none text-ink">Taken down</h3>
          <ul className="mt-3 flex flex-col gap-2.5" data-removed>
            {((removed ?? []) as unknown as Row[]).map((r) =>
              reviewCard(
                r,
                <form action={adminPublishReview.bind(null, r.id)}>
                  <Button type="submit" variant="secondary">Put it back</Button>
                </form>
              )
            )}
          </ul>
        </section>
      )}

      <section className="border-t border-border pt-6">
        <h3 className="font-display text-[20px] leading-none text-ink">How it runs</h3>
        <div className="mt-3 flex flex-wrap gap-4">
          <form action={saveSetting} className="flex items-end gap-2">
            <input type="hidden" name="key" value="reviews_hold_all" />
            <input type="hidden" name="back" value="/admin/reviews" />
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-fg">New reviews</span>
              <select name="value" defaultValue={setting("reviews_hold_all")} className={input}>
                <option value="true">Wait for one of us, every time</option>
                <option value="false">Go up once confirmed, unless flagged</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Save</Button>
          </form>
          <form action={saveSetting} className="flex items-end gap-2">
            <input type="hidden" name="key" value="enquiry_followup_days" />
            <input type="hidden" name="back" value="/admin/reviews" />
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-fg">Ask &ldquo;did you book?&rdquo; after (days)</span>
              <input name="value" type="number" min={SETTING_RANGES.enquiry_followup_days[0]} max={SETTING_RANGES.enquiry_followup_days[1]} defaultValue={setting("enquiry_followup_days")} className={`${input} w-24`} />
            </label>
            <Button type="submit" variant="secondary">Save</Button>
          </form>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="font-display text-[20px] leading-none text-ink">Decisions</h3>
        <ul className="mt-3 text-[13.5px]" data-review-log>
          {(log ?? []).map((l, i) => {
            const x = l as unknown as { reviews: { author_name: string; providers: { name: string } | null } | null };
            return (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-border py-1.5">
                <span className="text-fg">
                  {ACTION[l.action as string] ?? l.action}: {x.reviews?.author_name ?? "?"} on {x.reviews?.providers?.name ?? "?"}
                  {l.reason ? ` (${REPORT_REASONS[l.reason as keyof typeof REPORT_REASONS] ?? l.reason})` : ""}
                  {l.note ? `, "${l.note}"` : ""}
                </span>
                <span className="text-subtle">{l.created_by ? names.get(l.created_by as string) ?? "an admin" : "automatic"} · {when(l.created_at as string)}</span>
              </li>
            );
          })}
          {(log ?? []).length === 0 && <li className="text-subtle">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}
