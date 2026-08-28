import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines } from "@/lib/supabase/queries";
import { createClinic, deleteClinic } from "./actions";

export const metadata = { title: "Clinics" };

export default async function ClinicsPage() {
  const supabase = await createClient();
  let hasClinicsTier = false;
  let clinics: { id: string; title: string; start_date: string; location_text: string }[] = [];
  const disciplines = await getDisciplines(supabase);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
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
          <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-muted">
            You haven&apos;t listed any clinics yet.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
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
        <form action={createClinic} className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Title</span>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Weekend Working Equitation Clinic"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">Description</span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Discipline</span>
              <select
                name="discipline_id"
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
              >
                <option value="">Any discipline</option>
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Location</span>
              <input
                name="location_text"
                type="text"
                required
                placeholder="e.g. Bendigo VIC"
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Start date</span>
              <input
                name="start_date"
                type="date"
                required
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">End date (optional)</span>
              <input
                name="end_date"
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
              />
            </label>
          </div>
          <Button type="submit" className="self-start">
            List clinic
          </Button>
        </form>
      </section>
    </div>
  );
}
