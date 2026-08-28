import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

const statusLabels: Record<string, string> = {
  inactive: "Not subscribed",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

export default async function DashboardPage() {
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

  return (
    <div className="flex flex-col gap-6">
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
        {/* Stripe Checkout wiring lands in phase 5 — links to pricing for now */}
        <LinkButton href="/for-coaches" className="mt-4">
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
