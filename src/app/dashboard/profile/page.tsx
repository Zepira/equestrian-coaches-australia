import { Button } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";

export const metadata = { title: "Edit profile" };

// Form is UI-only until Supabase (DB + Storage) is wired up
// (build plan, phase 3).
export default function ProfileEditPage() {
  return (
    <form className="flex flex-col gap-6">
      <div>
        <span className="mb-2 block text-sm font-medium text-fg">Profile photo</span>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-accent-soft" aria-hidden />
          <Button type="button" variant="secondary">
            Upload photo
          </Button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Headline</span>
        <input
          type="text"
          placeholder="e.g. Working equitation, from first flatwork to your first competition."
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Bio</span>
        <textarea
          rows={5}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Suburb</span>
          <input
            type="text"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">State</span>
          <input
            type="text"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">Disciplines you teach</legend>
        <div className="flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <label
              key={d.slug}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-checked:border-accent has-checked:bg-accent-soft"
            >
              <input type="checkbox" name="discipline" value={d.slug} className="accent-current" />
              {d.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Qualifications</span>
        <textarea
          rows={3}
          placeholder="One per line — e.g. EA Level 1 Coach"
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted"
        />
      </label>

      <Button type="submit" className="self-start">
        Save profile
      </Button>
    </form>
  );
}
