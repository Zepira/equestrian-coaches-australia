import { Button, LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines } from "@/lib/supabase/queries";
import { saveRiderPreferences } from "./actions";

export const metadata = { title: "My account" };

// Favourite coaches list still isn't wired — that's the rest of phase 7.
export default async function AccountPage() {
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);

  let area = "";
  let followedIds: string[] = [];

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("rider_preferences")
        .select("suburb, postcode, followed_discipline_ids")
        .eq("rider_id", user.id)
        .maybeSingle();
      if (data) {
        area = [data.suburb, data.postcode].filter(Boolean).join(" ");
        followedIds = data.followed_discipline_ids ?? [];
      }
    }
  }

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
        <form action={saveRiderPreferences} className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">My area</span>
            <input
              name="area"
              type="text"
              defaultValue={area}
              placeholder="e.g. Bendigo VIC"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted sm:max-w-xs"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-fg">Disciplines I follow</legend>
            <div className="flex flex-wrap gap-2">
              {disciplines.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-checked:border-accent has-checked:bg-accent-soft"
                >
                  <input
                    type="checkbox"
                    name="discipline"
                    value={d.id}
                    defaultChecked={followedIds.includes(d.id)}
                    className="accent-current"
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" className="self-start">
            Save preferences
          </Button>
        </form>
      </section>
    </div>
  );
}
