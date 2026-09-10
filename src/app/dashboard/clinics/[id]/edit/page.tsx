import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/field";
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
    <div className="fade-in">
      <h1 className="font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Edit clinic</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted">Changes go live straight away on the clinic page and your profile.</p>
    <form action={updateClinic.bind(null, id)} className="mt-6 flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-4 wide:p-6">
      <label className="block">
        <span className={labelClass}>Title</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={clinic.title}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={clinic.description}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Discipline</span>
          <select
            name="discipline_id"
            defaultValue={clinic.discipline_id ?? ""}
            className={inputClass}
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
          <span className={labelClass}>Location</span>
          <input
            name="location_text"
            type="text"
            required
            defaultValue={clinic.location_text}
            className={inputClass}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Start date</span>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={clinic.start_date}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>End date (optional)</span>
          <input
            name="end_date"
            type="date"
            defaultValue={clinic.end_date ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <Button type="submit" className="h-12 self-start px-6 text-[15px]">
        Save changes
      </Button>
    </form>
    </div>
  );
}
