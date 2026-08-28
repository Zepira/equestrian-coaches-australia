import { Button, LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Clinics" };

export default async function ClinicsPage() {
  const supabase = await createClient();
  let hasClinicsTier = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("coach_profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .maybeSingle();
      hasClinicsTier =
        data?.subscription_tier === "standard_plus_clinics" && data?.subscription_status === "active";
    }
  }

  if (!hasClinicsTier) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
        Clinics are available on the Standard + Clinics plan.
        <div className="mt-3">
          <LinkButton href="/dashboard/billing">Upgrade plan</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">Your clinics</h2>
        {/* Create/edit/delete lands in phase 6 — this tab just proves the
            tier gate is real for now. */}
        <Button type="button" disabled>
          + New clinic
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
        You haven&apos;t listed any clinics yet.
      </div>
    </div>
  );
}
