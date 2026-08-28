import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <form action={updateClinic.bind(null, id)} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Title</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={clinic.title}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={clinic.description}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Discipline</span>
          <select
            name="discipline_id"
            defaultValue={clinic.discipline_id ?? ""}
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
            defaultValue={clinic.location_text}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
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
            defaultValue={clinic.start_date}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">End date (optional)</span>
          <input
            name="end_date"
            type="date"
            defaultValue={clinic.end_date ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
      </div>
      <Button type="submit" className="self-start">
        Save changes
      </Button>
    </form>
  );
}
