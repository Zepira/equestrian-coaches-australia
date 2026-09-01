import { notFound } from "next/navigation";
import { ClinicForm } from "@/components/clinic-form";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines } from "@/lib/supabase/queries";
import { updateClinic } from "../../actions";

export const metadata = { title: "Edit clinic" };

export default async function EditClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: clinic }, disciplines] = await Promise.all([
    supabase
      .from("clinics")
      .select("title, description, discipline_id, location_text, start_date, end_date")
      .eq("id", id)
      .eq("coach_id", user.id)
      .maybeSingle(),
    getDisciplines(supabase),
  ]);
  if (!clinic) notFound();

  return (
    <ClinicForm
      action={updateClinic.bind(null, id)}
      disciplines={disciplines}
      defaultValues={clinic}
      submitLabel="Save changes"
    />
  );
}
