import { Button } from "@/components/ui/button";

export const metadata = { title: "Clinics" };

// Placeholder: assumes the "standard_plus_clinics" tier for now. Real gating
// reads the coach's subscription_tier from Supabase (build plan, phase 6).
const hasClinicsTier = true;

export default function ClinicsPage() {
  if (!hasClinicsTier) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
        Clinics are available on the Standard + Clinics plan.
        <div className="mt-3">
          <Button type="button">Upgrade plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">Your clinics</h2>
        <Button type="button">+ New clinic</Button>
      </div>

      <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
        You haven&apos;t listed any clinics yet.
      </div>
    </div>
  );
}
