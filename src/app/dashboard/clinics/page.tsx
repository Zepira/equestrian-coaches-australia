import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { ClinicForm } from "@/components/clinic-form";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines } from "@/lib/supabase/queries";
import { getSessionUser } from "@/lib/supabase/session";
import { createClinic, deleteClinic } from "./actions";

export const metadata = { title: "Clinics" };

export default async function ClinicsPage() {
  const supabase = await createClient();
  let hasClinicsTier = false;
  let clinics: { id: string; title: string; start_date: string; location_text: string }[] = [];
  const disciplines = await getDisciplines(supabase);

  if (supabase) {
    const user = await getSessionUser(supabase);
    if (user) {
      const { data: coach } = await supabase
        .from("coach_profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .maybeSingle();
      hasClinicsTier =
        coach?.subscription_tier === "standard_plus_clinics" && coach?.subscription_status === "active";

      if (hasClinicsTier) {
        const { data } = await supabase
          .from("clinics")
          .select("id, title, start_date, location_text")
          .eq("coach_id", user.id)
          .order("start_date");
        clinics = data ?? [];
      }
    }
  }

  if (!hasClinicsTier) {
    return (
      <div className="rounded-[var(--radius-tile)] border border-dashed border-border p-6 text-center text-muted">
        Clinics are available on the Standard + Clinics plan.
        <div className="mt-3">
          <LinkButton href="/dashboard/billing">Upgrade plan</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold text-fg">Your clinics</h2>
        {clinics.length === 0 ? (
          <div className="mt-3 rounded-[var(--radius-tile)] border border-dashed border-border p-6 text-center text-muted">
            You haven&apos;t listed any clinics yet.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex flex-col gap-2 rounded-[var(--radius-tile)] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold text-fg">{clinic.title}</div>
                  <div className="text-sm text-muted">
                    {new Date(clinic.start_date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {clinic.location_text}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/clinics/${clinic.id}/edit`}
                    className="text-sm font-medium text-accent"
                  >
                    Edit
                  </Link>
                  <form action={deleteClinic.bind(null, clinic.id)}>
                    <button type="submit" className="text-sm font-medium text-danger">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-fg">List a new clinic</h2>
        <div className="mt-4">
          <ClinicForm action={createClinic} disciplines={disciplines} submitLabel="List clinic" />
        </div>
      </section>
    </div>
  );
}
