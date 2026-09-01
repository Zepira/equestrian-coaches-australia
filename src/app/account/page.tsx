import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/button";
import { TermCheckboxGroup } from "@/components/term-checkbox-group";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines } from "@/lib/supabase/queries";
import { getSessionUser } from "@/lib/supabase/session";
import { saveRiderPreferences, removeFavourite } from "./actions";

export const metadata = { title: "My account", robots: { index: false, follow: false } };

type Favourite = {
  coachId: string;
  slug: string;
  name: string;
  headline: string;
  suburb: string;
  state: string;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const disciplines = await getDisciplines(supabase);

  let area = "";
  let followedIds: string[] = [];
  let favourites: Favourite[] = [];

  if (supabase) {
    const user = await getSessionUser(supabase);
    if (user) {
      const [{ data: prefs }, { data: favouriteRows }] = await Promise.all([
        supabase
          .from("rider_preferences")
          .select("suburb, postcode, followed_discipline_ids")
          .eq("rider_id", user.id)
          .maybeSingle(),
        supabase
          .from("favourites")
          .select(
            "coach_id, coach_profiles(slug, headline, suburb, state, profiles!coach_profiles_id_fkey(name))"
          )
          .eq("rider_id", user.id),
      ]);

      if (prefs) {
        area = [prefs.suburb, prefs.postcode].filter(Boolean).join(" ");
        followedIds = prefs.followed_discipline_ids ?? [];
      }

      favourites = (favouriteRows ?? [])
        .map((row) => {
          const coach = (
            row as unknown as {
              coach_profiles: {
                slug: string;
                headline: string;
                suburb: string;
                state: string;
                profiles: { name: string } | null;
              } | null;
            }
          ).coach_profiles;
          if (!coach) return null;
          return {
            coachId: row.coach_id,
            slug: coach.slug,
            name: coach.profiles?.name ?? "Coach",
            headline: coach.headline,
            suburb: coach.suburb,
            state: coach.state,
          };
        })
        .filter((f): f is Favourite => f !== null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-fg sm:text-3xl">My account</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-fg">Favourite coaches</h2>
        {favourites.length === 0 ? (
          <div className="mt-3 rounded-[var(--radius-tile)] border border-dashed border-border p-6 text-center text-muted">
            You haven&apos;t favourited any coaches yet.
            <div className="mt-3">
              <LinkButton href="/search" variant="secondary">
                Browse coaches
              </LinkButton>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {favourites.map((f) => (
              <div
                key={f.coachId}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-tile)] border border-border bg-surface p-4"
              >
                <Link href={`/coaches/${f.slug}`} className="min-w-0">
                  <div className="font-semibold text-fg">{f.name}</div>
                  <div className="text-sm text-muted">
                    {f.suburb} {f.state}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{f.headline}</p>
                </Link>
                <form action={removeFavourite.bind(null, f.coachId)} className="shrink-0">
                  <button type="submit" className="text-sm font-medium text-danger">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
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
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted sm:max-w-xs"
            />
          </label>
          <TermCheckboxGroup
            legend="Disciplines I follow"
            name="discipline"
            terms={disciplines}
            selectedIds={followedIds}
            configured
          />
          <Button type="submit" className="self-start">
            Save preferences
          </Button>
        </form>
      </section>
    </div>
  );
}
