import Link from "next/link";
import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";
import { monthStats, twelveMonthViews, profileCompleteness } from "@/lib/coach-stats";
import { TakingStudentsControl } from "./taking-students-control";
import { StatusPill } from "./enquiry-status-button";
import type { EnquiryStatus } from "./actions";
import type { TakingStudents } from "./actions";
import { startCheckout } from "./billing/actions";
import { isTier } from "@/lib/tiers";

export const metadata = { title: "Dashboard" };

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function delta(n: number, pct = false) {
  if (n === 0) return { text: "—", tone: "text-subtle" };
  const sign = n > 0 ? "+" : "−";
  return { text: `${sign}${Math.abs(n)}${pct ? "%" : ""}`, tone: n > 0 ? "text-ink" : "text-accent" };
}

/**
 * Overview (canvas: Dashboards 1a/1b). The four numbers from the For
 * Coaches promise, the twelve-month view chart, the taking-students switch,
 * profile completeness, the latest enquiries, next clinic and the plan card
 * — all real, and labelled "on-site search" until Search Console is wired.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; checkout?: string; mock?: string }>;
}) {
  const { tier: pendingTier, checkout, mock } = await searchParams;
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard");
  const { supabase, userId, firstName, coach } = ctx;
  const now = new Date();

  const [stats, trend, { data: enquiries }, { data: photos }, { data: terms }, { data: testimonials }, { data: clinics }] = await Promise.all([
    monthStats(supabase, userId, now),
    twelveMonthViews(supabase, userId, now),
    supabase.from("enquiries").select("id, rider_name, want, message, status, created_at").eq("coach_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("coach_photos").select("id").eq("coach_id", userId).limit(1),
    supabase.from("coach_terms").select("terms(kind)").eq("coach_id", userId),
    supabase.from("testimonials").select("id").eq("coach_id", userId),
    supabase.from("clinics").select("id, title, start_date, location_text, places_left").eq("coach_id", userId).gte("start_date", now.toISOString().slice(0, 10)).order("start_date").limit(1),
  ]);
  const disciplineCount = (terms ?? []).filter((t) => (t as unknown as { terms: { kind: string } | null }).terms?.kind === "discipline").length;
  const completeness = profileCompleteness({
    hasPhoto: (photos ?? []).length > 0,
    bio: String(coach.bio ?? ""),
    disciplineCount,
    hasLocation: Boolean(coach.lat),
    testimonialCount: (testimonials ?? []).length,
    hasVideo: Boolean(coach.video_url),
  });
  const nextClinic = clinics?.[0] ?? null;
  const prevMonth = MONTH_FULL[(now.getMonth() + 11) % 12];
  const quiet = stats.views === 0 && stats.enquiries === 0 && stats.reveals === 0;
  const greeting = quiet ? `A quiet month, ${firstName}.` : `Good month, ${firstName}.`;
  const prevReveals = stats.reveals - stats.delta.reveals;
  const summary = quiet
    ? "Nothing happened this month yet, and that's the honest number. The two things most likely to change it: add a photo and three testimonials, and share your ECA graphic in your local riders' group."
    : `${stats.reveals} rider${stats.reveals === 1 ? "" : "s"} tapped to see your number, ${stats.delta.reveals >= 0 ? "up" : "down"} from ${prevReveals} in ${prevMonth}. ${stats.impressions} search${stats.impressions === 1 ? "" : "es"} on ECA listed you this month.`;
  const max = Math.max(1, ...trend.map((t) => t.views));
  const first = trend[0].views;
  const last = trend[trend.length - 1].views;
  const trendNote =
    last === 0 && first === 0
      ? "Views build once your profile is complete and indexed — six to twelve months for Google traffic is normal for a new site."
      : last >= first
        ? `Views have ${first === 0 ? "started arriving" : `risen from ${first} to ${last}`} over the year. Search impressions are the leading number — views and enquiries follow them by a month or two.`
        : "Views dipped this month. Spring usually picks up — riders start searching for coaches when the ground firms up.";
  const tiles = [
    { value: stats.impressions, label: "Appeared in search (on ECA)", d: delta(stats.delta.impressions) },
    { value: stats.views, label: "Profile views", d: delta(stats.delta.views) },
    { value: stats.reveals, label: "Tapped to call", d: delta(stats.delta.reveals) },
    { value: stats.enquiries, label: "Enquiries", d: delta(stats.delta.enquiries) },
  ];
  const showCompleteSubscription = ctx.status !== "active" && isTier(pendingTier);

  const tile = (t: (typeof tiles)[number]) => (
    <div key={t.label} data-stat className="rounded-[14px] border border-border bg-surface px-3.5 py-4 wide:rounded-[16px] wide:px-5 wide:py-[22px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[38px] leading-none text-ink wide:text-[48px] wide:-tracking-[0.02em]">{t.value}</span>
        <span data-delta className={`text-[12px] font-medium wide:text-[13px] ${t.d.tone}`}>{t.d.text}</span>
      </div>
      <div className="mt-2 text-[13px] leading-[1.3] text-muted wide:mt-2.5 wide:text-[14px]">{t.label}</div>
    </div>
  );

  const completenessCard = (
    <div data-completeness className="order-4 rounded-[16px] border border-border bg-surface p-[18px] wide:order-2 wide:rounded-[18px] wide:px-6 wide:py-[22px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[22px] leading-none text-ink wide:text-[24px]">Profile completeness</span>
        <span className="font-display text-[20px] text-accent wide:text-[24px]" data-complete>{completeness.pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-shade wide:mt-3.5">
        <div className="h-full rounded-[3px] bg-accent transition-[width] duration-700" style={{ width: `${completeness.pct}%` }} />
      </div>
      <ul className="mt-3.5 flex flex-col gap-[9px] wide:mt-4 wide:gap-2.5">
        {completeness.items.map((c) => (
          <li key={c.label} className={`flex items-center gap-2.5 text-[14.5px] ${c.done ? "text-fg" : "text-subtle"}`}>
            <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[999px] border text-[12px] ${c.done ? "border-ink bg-ink text-ink-fg" : "border-[#d9cdb6] bg-transparent"}`}>
              {c.done ? "✓" : ""}
            </span>
            <span className="flex-1">{c.label}</span>
            {!c.done && c.href && (
              <Link href={c.href} className="text-[13px] font-medium text-accent">
                Add
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const latest = (
    <div data-latest className="order-3 rounded-[16px] border border-border bg-surface p-[18px] wide:order-3 wide:rounded-[18px] wide:px-6 wide:py-[22px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[22px] leading-none text-ink wide:text-[24px]">Latest enquiries</span>
        <Link href="/dashboard/enquiries" className="text-[14px] font-medium text-accent">
          All {ctx.newEnquiries > 0 ? `${ctx.newEnquiries} new` : ""} →
        </Link>
      </div>
      <div className="mt-2 flex flex-col">
        {(enquiries ?? []).map((e) => (
          <div key={e.id} className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-shade py-[13px] wide:grid-cols-[1fr_auto_auto] wide:items-center wide:gap-4 wide:py-3.5">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-fg">
                {e.rider_name} <span className="font-normal text-subtle">· {e.want === "regular" ? "Regular lessons" : e.want === "one_off" ? "One-off" : "Clinic"}</span>
              </div>
              <div className="mt-[3px] truncate text-[13px] leading-[1.4] text-muted wide:text-[13.5px]">{e.message}</div>
            </div>
            <span className="hidden text-[12.5px] text-subtle wide:inline">{new Date(e.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
            <StatusPill status={e.status as EnquiryStatus} className="self-start" />
          </div>
        ))}
        {(enquiries ?? []).length === 0 && <p className="border-t border-shade pt-3 text-[14px] text-subtle">No enquiries yet — they land here the moment a rider sends one.</p>}
      </div>
    </div>
  );

  const chart = (
    <div data-chart className="order-1 flex flex-col rounded-[16px] bg-ink px-[18px] py-5 text-ink-fg wide:rounded-[18px] wide:px-7 wide:py-[26px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[22px] leading-none wide:text-[26px]">Twelve months of views</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-peach">{ctx.planName}{ctx.tier ? " insight" : ""}</span>
      </div>
      <div className="mt-[18px] grid h-[90px] grid-cols-12 items-end gap-[5px] wide:mt-[22px] wide:min-h-[130px] wide:flex-1 wide:gap-2" role="img" aria-label={`Profile views by month: ${trend.map((t) => `${t.key} ${t.views}`).join(", ")}`}>
        {trend.map((t, i) => (
          <div key={t.key} className="flex h-full flex-col justify-end">
            <div
              className={`origin-bottom rounded-t-[3px] wide:rounded-t-[4px] ${i === trend.length - 1 ? "bg-peach" : "bg-ink-fg/35"}`}
              style={{ height: `${Math.max(2, Math.round((t.views / max) * 100))}%`, animation: "grow 0.7s cubic-bezier(.16,1,.3,1) both" }}
              data-views={t.views}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-[5px] text-center text-[10px] text-ink-fg/55 wide:gap-2 wide:text-[11px]">
        {trend.map((t) => (
          <span key={t.key}>{MONTH_SHORT[Number(t.key.slice(5, 7)) - 1].charAt(0)}</span>
        ))}
      </div>
      <p className="mt-4 text-[14px] leading-[1.5] text-ink-fg/80 wide:mt-[18px] wide:text-[14.5px]">{trendNote}</p>
    </div>
  );

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      {checkout === "success" && (
        <p className="mb-4 rounded-[12px] border border-border bg-accent-soft p-3 text-[14px] text-fg">
          {mock === "1" ? "Mock subscription activated — your profile is published. No card was charged." : "Payment received — your plan updates here shortly once Stripe confirms it."}
        </p>
      )}
      {showCompleteSubscription && (
        <div className="mb-4 rounded-[16px] border border-accent bg-accent-soft p-5">
          <div className="font-display text-[22px] text-ink">Complete your subscription</div>
          <p className="mt-1 text-[14px] text-fg">One step left — subscribe to publish your profile and appear in search.</p>
          <form action={startCheckout.bind(null, pendingTier as "listed")} className="mt-4">
            <button type="submit" className="rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-[15px] font-semibold text-accent-fg">Continue to payment</button>
          </form>
        </div>
      )}

      <div className="wide:flex wide:items-end wide:justify-between wide:gap-6">
        <div>
          <p data-month className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">
            {MONTH_FULL[now.getMonth()]} {now.getFullYear()} · your month so far
          </p>
          <h1 className="mt-1.5 text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-2 wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">{greeting}</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-muted wide:mt-3 wide:max-w-[60ch] wide:text-[16px]">{summary}</p>
        </div>
        <div className="hidden min-w-[300px] shrink-0 flex-col gap-2.5 rounded-[14px] border border-border bg-surface px-4 py-3.5 wide:flex">
          <span className="font-display text-[18px] leading-none text-ink">Taking new students?</span>
          <TakingStudentsControl value={(coach.taking_students as TakingStudents) ?? "yes"} compact />
        </div>
      </div>

      <div data-stats className="mt-5 grid grid-cols-2 gap-2 wide:mt-8 wide:grid-cols-4 wide:gap-3">{tiles.map(tile)}</div>

      {/* One set of cards; CSS grid `order` gives phones the canvas's stack
          (chart, taking-students, latest, completeness, plan) and desktop
          its two rows (chart + completeness, latest + next clinic). */}
      <div className="mt-[18px] grid grid-cols-1 gap-[18px] wide:mt-4 wide:grid-cols-[1.5fr_1fr] wide:items-stretch wide:gap-4">
        {chart}
        <div data-taking className="order-2 rounded-[16px] border border-border bg-surface p-[18px] wide:hidden">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[22px] leading-none text-ink">Taking new students?</span>
            <span className="text-[13px] text-subtle">Shown on your profile</span>
          </div>
          <div className="mt-3.5">
            <TakingStudentsControl value={(coach.taking_students as TakingStudents) ?? "yes"} />
          </div>
        </div>
        {latest}
        {completenessCard}
        <div data-plan className="order-5 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[16px] bg-shade p-[18px] wide:hidden">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">Your plan</p>
            <p className="mt-1.5 font-display text-[22px] leading-none text-ink">
              {ctx.planName}
              {ctx.status === "active" && (
                <>
                  {" "}
                  · <em className="text-accent">founding</em>
                </>
              )}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-[1.45] text-muted">{ctx.planLine}</p>
          </div>
          <Link href="/dashboard/billing" className="whitespace-nowrap rounded-[var(--radius-pill)] border border-ink px-3.5 py-[9px] text-[13px] font-medium text-ink">
            Billing
          </Link>
        </div>
        <div data-next-clinic className="order-6 hidden rounded-[18px] border border-border bg-surface px-6 py-[22px] wide:order-4 wide:block">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[24px] leading-none text-ink">Next clinic</span>
            <Link href="/dashboard/clinics" className="text-[14px] font-medium text-accent">
              Manage →
            </Link>
          </div>
          {nextClinic ? (
            <div className="mt-4 grid grid-cols-[60px_1fr] gap-3.5">
              <span className="self-start rounded-[10px] bg-shade py-2 text-center">
                <span className="block font-display text-[26px] leading-none text-ink">{new Date(nextClinic.start_date).getDate()}</span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">{MONTH_SHORT[new Date(nextClinic.start_date).getMonth()]}</span>
              </span>
              <div>
                <div className="font-display text-[20px] leading-[1.1] text-ink">{nextClinic.title}</div>
                <div className="mt-[5px] text-[13px] text-subtle">{nextClinic.location_text}</div>
                {nextClinic.places_left != null && (
                  <div className="mt-2.5 text-[13.5px] text-fg">
                    <strong className="font-medium text-ink">{nextClinic.places_left}</strong> places left
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[14px] text-subtle">No upcoming clinic. List one and riders nearby who follow your disciplines get an email.</p>
          )}
        </div>
      </div>
    </div>
  );
}
