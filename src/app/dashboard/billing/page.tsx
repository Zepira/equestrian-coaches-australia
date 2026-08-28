import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe";
import { startCheckout, openBillingPortal } from "./actions";

export const metadata = { title: "Billing" };

const tierLabels: Record<string, string> = {
  standard: "Standard — $9.99/mo",
  standard_plus_clinics: "Standard + Clinics — $14.95/mo",
};
const statusLabels: Record<string, string> = {
  inactive: "No active subscription",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

export default async function BillingPage() {
  const supabase = await createClient();
  let status = "inactive";
  let tier: string | null = null;
  let hasCustomer = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("coach_profiles")
        .select("subscription_status, subscription_tier, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        status = data.subscription_status;
        tier = data.subscription_tier;
        hasCustomer = Boolean(data.stripe_customer_id);
      }
    }
  }

  const isActive = status === "active";

  return (
    <div className="flex flex-col gap-6">
      {!isStripeConfigured && (
        <p className="rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
          Payments aren&apos;t connected yet — plan selection is a preview until Stripe is set up
          (build plan, phase 5).
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Current plan</div>
        <div className="mt-1 text-lg font-semibold text-fg">
          {tier ? tierLabels[tier] : statusLabels[status]}
        </div>
        {tier && <p className="mt-1 text-sm text-muted">{statusLabels[status]}</p>}
      </div>

      {isActive && hasCustomer ? (
        <form action={openBillingPortal}>
          <Button type="submit" variant="secondary" disabled={!isStripeConfigured}>
            Manage billing (Stripe)
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={startCheckout.bind(null, "standard")}>
            <Button type="submit" variant="secondary" disabled={!isStripeConfigured} className="w-full">
              Choose Standard — $9.99/mo
            </Button>
          </form>
          <form action={startCheckout.bind(null, "standard_plus_clinics")}>
            <Button type="submit" disabled={!isStripeConfigured} className="w-full">
              Choose Standard + Clinics — $14.95/mo
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
