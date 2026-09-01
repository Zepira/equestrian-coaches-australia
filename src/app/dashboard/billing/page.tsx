import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isMockPayments } from "@/lib/stripe";
import { tierLabel, SUBSCRIPTION_STATUS_LABELS, type SubscriptionTier } from "@/lib/pricing";
import { getSessionUser } from "@/lib/supabase/session";
import { startCheckout, openBillingPortal, mockCancelSubscription } from "./actions";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const supabase = await createClient();
  let status = "inactive";
  let tier: string | null = null;

  if (supabase) {
    const user = await getSessionUser(supabase);
    if (user) {
      const { data } = await supabase
        .from("coach_profiles")
        .select("subscription_status, subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        status = data.subscription_status;
        tier = data.subscription_tier;
      }
    }
  }

  const isActive = status === "active";

  return (
    <div className="flex flex-col gap-6">
      {isMockPayments && (
        <p className="rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
          Running on <strong>mock payments</strong> — no Stripe account exists yet (business
          structure still being confirmed). Subscribing here updates the real database and
          unlocks every gated feature, but no card is charged. Swaps to real Stripe automatically
          once keys are added to <code>.env</code>.
        </p>
      )}

      <div className="rounded-[var(--radius-tile)] border border-border bg-surface p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Current plan</div>
        <div className="mt-1 text-lg font-semibold text-fg">
          {tier ? tierLabel(tier as SubscriptionTier) : SUBSCRIPTION_STATUS_LABELS[status]}
        </div>
        {tier && <p className="mt-1 text-sm text-muted">{SUBSCRIPTION_STATUS_LABELS[status]}</p>}
      </div>

      {isActive ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={openBillingPortal}>
            <Button type="submit" variant="secondary">
              {isMockPayments ? "Manage billing" : "Manage billing (Stripe)"}
            </Button>
          </form>
          {isMockPayments && (
            <form action={mockCancelSubscription}>
              <Button type="submit" variant="danger-ghost">
                Cancel subscription (mock)
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={startCheckout.bind(null, "standard")}>
            <Button type="submit" variant="secondary" className="w-full">
              Choose {tierLabel("standard")}
            </Button>
          </form>
          <form action={startCheckout.bind(null, "standard_plus_clinics")}>
            <Button type="submit" className="w-full">
              Choose {tierLabel("standard_plus_clinics")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
