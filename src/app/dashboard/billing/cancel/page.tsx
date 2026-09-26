import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadDashboard } from "@/lib/dashboard";
import { isMockPayments } from "@/lib/stripe";
import { fillVariables, getContent } from "@/lib/cms/read";
import { formatLongDate, getFoundingPrice, getPauseMaxMonths } from "@/lib/settings";
import { cancelSubscription, changePlan, pauseSubscription } from "../actions";

export const metadata = { title: "Before you go", robots: { index: false, follow: false } };

/**
 * Behind "Cancel" on billing (The Marketing Engine stage E): moving down to
 * Listed, a pause, and cancelling, side by side and equal. Cancelling is one
 * click here, never a step further on. Words in the billing.leaving block.
 */
export default async function LeavingPage() {
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/billing/cancel");
  const { status, tier, plans, provider } = ctx;
  if (!["active", "trialing"].includes(status ?? "")) redirect("/dashboard/billing");
  const [w, max, foundingPrice, { data: sub }] = await Promise.all([
    getContent("billing.leaving"),
    getPauseMaxMonths(),
    getFoundingPrice(),
    ctx.supabase.from("subscriptions").select("current_period_end, trial_ends_at, founding").eq("provider_id", ctx.providerId).maybeSingle(),
  ]);
  const founding = Boolean(sub?.founding) || provider.cohort === "founding";
  const listedPrice = founding ? foundingPrice : plans.listed.monthly;
  const end = isMockPayments ? null : (sub?.current_period_end ?? sub?.trial_ends_at) as string | null;
  const f = (t: string) => fillVariables(t, { listed: plans.listed.name, listed_price: listedPrice, end_date: end ? formatLongDate(new Date(end)) : "today" });
  const showListed = status === "active" && tier !== "listed";
  const card = "flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-5";
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] text-fg";

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      <p className="text-[14px]"><Link href="/dashboard/billing" className="text-accent">← Billing</Link></p>
      <h1 className="mt-3 text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px]">{w.title}</h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">{w.lead}</p>
      <div className={`mt-6 grid gap-3 ${showListed ? "wide:grid-cols-3" : "wide:grid-cols-2"}`}>
        {showListed && (
          <section className={card} data-choice="listed">
            <h2 className="font-display text-[26px] leading-none text-ink">{f(w.listedTitle)}</h2>
            <p className="text-[14.5px] leading-[1.5] text-muted">{f(w.listedBody)}</p>
            <form action={changePlan.bind(null, "listed")} className="mt-auto"><Button type="submit" variant="secondary" className="w-full">{f(w.listedTitle)}</Button></form>
          </section>
        )}
        <section className={card} data-choice="pause">
          <h2 className="font-display text-[26px] leading-none text-ink">{w.pauseTitle}</h2>
          <p className="text-[14.5px] leading-[1.5] text-muted">{w.pauseBody}</p>
          <form action={pauseSubscription} className="mt-auto flex flex-col gap-2">
            <select name="months" defaultValue="1" className={input} aria-label="How long">
              {Array.from({ length: max }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" className="w-full">{w.pauseTitle}</Button>
          </form>
        </section>
        <section className={card} data-choice="cancel">
          <h2 className="font-display text-[26px] leading-none text-ink">{w.cancelTitle}</h2>
          <p className="text-[14.5px] leading-[1.5] text-muted">{f(w.cancelBody)}</p>
          <form action={cancelSubscription} className="mt-auto flex flex-col gap-2">
            <select name="reason" defaultValue="" className={input} aria-label={w.reasonLabel}>
              <option value="">{w.reasonLabel}</option>
              {w.reasons.split("\n").map((r) => r.trim()).filter(Boolean).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" className="w-full">{w.cancelTitle}</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
