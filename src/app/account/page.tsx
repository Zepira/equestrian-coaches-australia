import { LinkButton } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";

export const metadata = { title: "My account" };

// Placeholder: real page reads the logged-in rider's favourites/preferences
// from Supabase once auth ships (build plan, phase 7).
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">My account</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-fg">Favourite coaches</h2>
        <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-muted">
          You haven&apos;t favourited any coaches yet.
          <div className="mt-3">
            <LinkButton href="/search" variant="secondary">
              Browse coaches
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-fg">Notify me about clinics</h2>
        <p className="mt-1 text-sm text-muted">
          Get an email when a coach in your area or discipline lists a new clinic.
        </p>
        <form className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">My area</span>
            <input
              type="text"
              placeholder="e.g. Bendigo VIC"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted sm:max-w-xs"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-fg">Disciplines I follow</legend>
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
        </form>
      </section>
    </div>
  );
}
