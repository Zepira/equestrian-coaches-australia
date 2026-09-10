import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";
import { isMockPayments } from "@/lib/stripe";
import { TIERS, TIER_META } from "@/lib/tiers";
import { startCheckout, changePlan, openBillingPortal, mockCancelSubscription } from "./actions";

export const metadata = { title: "Billing" };

/**
 * Billing (canvas: Dashboards › Billing): the ink plan card with the next
 * charge and card, "Change plan" as three options (both directions, any
 * time), Invoices / Update card via the Customer Portal, and the one-line
 * cancel. In mock mode the same DB fields change and no card exists.
 */
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  const ctx = await loadDashboard();
  if (!ctx) redirect("/login?next=/dashboard/billing");
  const { tier, status, planName } = ctx;
  const active = status === "active";
  const nextCharge = active ? (isMockPayments ? "— (mock)" : "See portal") : "—";
  const billingLine = active
    ? tier === "spotlight"
      ? "Founding offer: Spotlight free for six months, then $9.99 a month for as long as you stay — even after the price goes up for everyone else."
      : `${TIER_META[tier!].monthly} a month. Your founding $9.99 Listed rate is kept for you if you come back down.`
    : status === "past_due"
      ? "Your last payment didn't go through. Update your card to keep your listing live."
      : "No active subscription. Pick a plan below to publish your profile and appear in search.";

  return (
    <div className="fade-in" style={{ animationDuration: "0.5s" }}>
      <h1 className="text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Billing</h1>
      {isMockPayments && (
        <p className="mt-4 rounded-[12px] border border-border bg-accent-soft p-3 text-[13.5px] leading-[1.5] text-fg">
          Running on <strong>mock payments</strong> — no Stripe account exists yet. Plan changes here update the real database and unlock every gated feature, but no card is charged.
        </p>
      )}
      {changed === "1" && <p className="mt-4 rounded-[12px] bg-shade p-3 text-[14px] text-fg">Plan changed.</p>}

      <div className="mt-[18px] wide:mt-7 wide:grid wide:grid-cols-2 wide:items-start wide:gap-4">
        <div className="rounded-[16px] bg-ink px-5 py-[22px] text-ink-fg wide:rounded-[18px] wide:p-7" data-plan-card>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-peach">{active ? "Founding coach" : "Your plan"}</p>
          <p className="mt-2 font-display text-[34px] leading-none wide:mt-2.5 wide:text-[44px] wide:-tracking-[0.02em]">{planName}</p>
          <p className="mt-3 text-[14.5px] leading-[1.5] text-ink-fg/85 wide:mt-3.5 wide:text-[15px]">{billingLine}</p>
          <div className="mt-[18px] grid grid-cols-2 gap-2 wide:mt-[22px] wide:gap-2.5">
            <div className="rounded-[10px] bg-ink-card p-3 wide:rounded-[12px] wide:p-3.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-fg/60">Next charge</div>
              <div className="mt-1 font-display text-[20px] wide:text-[22px]">{nextCharge}</div>
            </div>
            <div className="rounded-[10px] bg-ink-card p-3 wide:rounded-[12px] wide:p-3.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-fg/60">Card</div>
              <div className="mt-1 font-display text-[20px] wide:text-[22px]">{active && !isMockPayments ? "On file" : "—"}</div>
            </div>
          </div>
          {active && (
            <div className="mt-[22px] hidden flex-wrap gap-2.5 wide:flex">
              <form action={openBillingPortal}>
                <button type="submit" className="rounded-[var(--radius-pill)] border border-ink-fg/40 px-4 py-2.5 text-[14px] font-medium text-ink-fg">Invoices</button>
              </form>
              <form action={openBillingPortal}>
                <button type="submit" className="rounded-[var(--radius-pill)] border border-ink-fg/40 px-4 py-2.5 text-[14px] font-medium text-ink-fg">Update card</button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-[22px] wide:mt-0">
          <p className="font-display text-[22px] leading-none text-ink wide:text-[26px]">{active ? "Change plan" : "Pick a plan"}</p>
          <p className="mt-2 text-[14px] leading-[1.5] text-muted wide:text-[14.5px]">
            {active ? "Both directions, any time. Go up for a clinic month and back down after." : "Annual is ten months' price; change plan any time once you're in."}
          </p>
          <div className="mt-3 flex flex-col gap-2 wide:mt-3.5">
            {TIERS.map((t) => {
              const current = active && tier === t;
              const action = active ? changePlan.bind(null, t) : startCheckout.bind(null, t);
              return (
                <form key={t} action={action}>
                  <button
                    type="submit"
                    disabled={current}
                    data-plan={t}
                    aria-current={current ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-[14px] border px-4 py-3.5 text-left wide:px-[18px] wide:py-4 ${current ? "border-ink bg-shade" : "border-border bg-surface"}`}
                  >
                    <span>
                      <span className="block font-display text-[20px] leading-none text-ink wide:text-[22px]">{TIER_META[t].name}</span>
                      <span className="mt-0.5 block text-[13px] text-subtle wide:text-[13.5px]">{TIER_META[t].tagline}</span>
                    </span>
                    <span className={`font-display text-[18px] wide:text-[20px] ${current ? "text-accent" : "text-ink"}`}>{current ? "Current" : `${TIER_META[t].monthly}/mo`}</span>
                  </button>
                </form>
              );
            })}
          </div>
          {active && (
            <>
              <div className="mt-[22px] flex flex-col gap-2 wide:hidden">
                <form action={openBillingPortal}>
                  <button type="submit" className="flex w-full justify-between rounded-[12px] border border-border bg-surface px-4 py-3.5 text-[15px] font-medium text-fg">
                    <span>Invoices</span>
                    <span className="text-subtle">→</span>
                  </button>
                </form>
                <form action={openBillingPortal}>
                  <button type="submit" className="flex w-full justify-between rounded-[12px] border border-border bg-surface px-4 py-3.5 text-[15px] font-medium text-fg">
                    <span>Update card</span>
                    <span className="text-subtle">→</span>
                  </button>
                </form>
              </div>
              <form action={isMockPayments ? mockCancelSubscription : openBillingPortal} className="mt-[18px]">
                <button type="submit" className="block w-full px-4 py-3.5 text-center text-[14px] leading-[1.5] text-subtle wide:px-0 wide:text-left">
                  Cancel subscription — one click, your listing stays live until the period ends and nothing you&apos;ve added is deleted.
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
