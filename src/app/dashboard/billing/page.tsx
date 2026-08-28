import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing" };

// Placeholder: real page links out to the Stripe Customer Portal once
// payments ship (build plan, phase 5).
export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Current plan</div>
        <div className="mt-1 text-lg font-semibold text-fg">No active subscription</div>
      </div>
      <Button type="button" variant="secondary" className="self-start">
        Manage billing (Stripe)
      </Button>
    </div>
  );
}
