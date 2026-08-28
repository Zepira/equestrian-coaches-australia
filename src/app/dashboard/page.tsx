import { Button, LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { startCheckout } from "./billing/actions";

export const metadata = { title: "Dashboard" };

const statusLabels: Record<string, string> = {
  inactive: "Not subscribed",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; checkout?: string; mock?: string }>;
}) {
  const { tier: pendingTier, checkout, mock } = await searchParams;
  const supabase = await createClient();
  let status = "inactive";
  let published = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("coach_profiles")
        .select("subscription_status, published")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        status = data.subscription_status;
        published = data.published;
      }
    }
  }

  const validPendingTier: "standard" | "standard_plus_clinics" | null =
    pendingTier === "standard" || pendingTier === "standard_plus_clinics" ? pendingTier : null;
  const showCompleteSubscription = status !== "active" && validPendingTier !== null;

  return (
    <div className="flex flex-col gap-6">
      {checkout === "success" && (
        <p className="rounded-md border border-border bg-accent-soft p-3 text-sm text-fg">
          {mock === "1"
            ? "Mock subscription activated — your profile is published. No card was charged."
            : "Payment received — your plan updates here shortly once Stripe confirms it."}
        </p>
      )}

      {showCompleteSubscription && (
        <div className="rounded-lg border border-accent bg-accent-soft p-5">
          <div className="text-lg font-semibold text-fg">Complete your subscription</div>
          <p className="mt-1 text-sm text-fg">
            One step left — subscribe to publish your profile and appear in search.
          </p>
          <form action={startCheckout.bind(null, validPendingTier as "standard" | "standard_plus_clinics")} className="mt-4">
            <Button type="submit">Continue to payment</Button>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">
          Subscription status
        </div>
        <div className="mt-1 text-lg font-semibold text-fg">{statusLabels[status] ?? status}</div>
        <p className="mt-1 text-sm text-muted">
          {published
            ? "Your profile is live and appears in search."
            : "Choose a plan to publish your profile and appear in search."}
        </p>
        <LinkButton href={status === "inactive" ? "/for-coaches" : "/dashboard/billing"} className="mt-4">
          {status === "inactive" ? "Choose a plan" : "Manage plan"}
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LinkButton href="/dashboard/profile" variant="secondary" className="justify-between">
          Edit your profile →
        </LinkButton>
        <LinkButton href="/dashboard/clinics" variant="secondary" className="justify-between">
          Manage clinics →
        </LinkButton>
      </div>
    </div>
  );
}
