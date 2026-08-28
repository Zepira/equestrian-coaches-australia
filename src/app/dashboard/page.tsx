import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

// Placeholder: real page reads the logged-in coach's row from Supabase
// once auth + billing ship (build plan, phases 2 & 5).
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">
          Subscription status
        </div>
        <div className="mt-1 text-lg font-semibold text-fg">Not subscribed</div>
        <p className="mt-1 text-sm text-muted">
          Choose a plan to publish your profile and appear in search.
        </p>
        <LinkButton href="/for-coaches" className="mt-4">
          Choose a plan
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
