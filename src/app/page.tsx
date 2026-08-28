import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineTag } from "@/components/discipline-tag";
import { LinkButton } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const featured = supabase
    ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})].slice(0, 3)
    : placeholderCoaches.slice(0, 3).map(toCoachCardData);
  const topDisciplines = disciplines.slice(0, 6);

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">
            Coaching, discipline by discipline
          </div>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-fg sm:text-6xl">
            Find your perfect riding coach, nearby.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Search verified coaches across Australia by discipline and location — liberty,
            bridleless, working equitation and every other discipline.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold text-fg sm:text-3xl">Start with the discipline you ride</h2>
        <p className="mt-2 max-w-xl text-muted">
          Coaches are listed by the disciplines they actually teach, not by keyword.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {topDisciplines.map((d) => (
            <DisciplineTag key={d.slug} slug={d.slug} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-fg sm:text-3xl">Recently listed coaches</h2>
            <LinkButton href="/search" variant="ghost" className="hidden shrink-0 sm:inline-flex">
              See all coaches →
            </LinkButton>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featured.map((coach) => (
              <CoachCard key={coach.slug} coach={coach} />
            ))}
          </div>
          <LinkButton href="/search" variant="secondary" className="mt-6 w-full sm:hidden">
            See all coaches
          </LinkButton>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="text-2xl font-bold text-fg sm:text-3xl">Coaching professionally?</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            List your profile from $9.99 a month — bio, photo, location, specialties,
            qualifications and testimonials.
          </p>
          <LinkButton href="/for-coaches" className="mt-6">
            List your coaching profile
          </LinkButton>
        </div>
      </section>
    </>
  );
}
