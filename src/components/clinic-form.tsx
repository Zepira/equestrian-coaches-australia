import { Button } from "@/components/ui/button";

const INPUT_CLASSNAME = "w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted";

type Discipline = { id: string; name: string };

type ClinicDefaults = {
  title?: string;
  description?: string;
  discipline_id?: string | null;
  location_text?: string;
  start_date?: string;
  end_date?: string | null;
};

/**
 * The clinic create/edit form — was duplicated near-byte-for-byte between
 * dashboard/clinics/page.tsx (create) and dashboard/clinics/[id]/edit/page.tsx
 * (edit), differing only in `action`, field defaults, and submit label.
 */
export function ClinicForm({
  action,
  disciplines,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  disciplines: Discipline[];
  defaultValues?: ClinicDefaults;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Title</span>
        <input
          name="title"
          type="text"
          required
          placeholder="e.g. Weekend Working Equitation Clinic"
          defaultValue={defaultValues?.title}
          className={INPUT_CLASSNAME}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description}
          className={INPUT_CLASSNAME}
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Discipline</span>
          <select
            name="discipline_id"
            defaultValue={defaultValues?.discipline_id ?? ""}
            className={INPUT_CLASSNAME}
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
            defaultValue={defaultValues?.location_text}
            className={INPUT_CLASSNAME}
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
            defaultValue={defaultValues?.start_date}
            className={INPUT_CLASSNAME}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">End date (optional)</span>
          <input
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date ?? ""}
            className={INPUT_CLASSNAME}
          />
        </label>
      </div>
      <Button type="submit" className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
