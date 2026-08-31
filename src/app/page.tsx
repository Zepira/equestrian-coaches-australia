import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineBentoTeaser } from "@/components/discipline-bento";
import { LinkButton } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import {
  searchCoaches,
  getSkills,
  getAttributes,
  getDisciplineCoachCounts,
} from "@/lib/supabase/queries";
import {
  searchMockCoaches,
  getMockCoachesByDiscipline,
} from "@/lib/mock-coaches";

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const [featured, skills, attributes, realDisciplineCounts] =
    await Promise.all([
      supabase
        ? [
            ...(await searchCoaches(supabase, {})),
            ...searchMockCoaches({}),
          ].slice(0, 4)
        : placeholderCoaches.slice(0, 4).map(toCoachCardData),
      getSkills(supabase),
      getAttributes(supabase),
      getDisciplineCoachCounts(supabase),
    ]);

  // Real counts (mock + Supabase), most-populated first — "featured"
  // means "has real content to show", not an arbitrary fixed order.
  const disciplinesByCount = disciplines
    .map((d) => ({
      ...d,
      count:
        (realDisciplineCounts[d.slug] ?? 0) +
        getMockCoachesByDiscipline(d.slug).length,
    }))
    .sort((a, b) => b.count - a.count);
  const bentoDisciplines = disciplinesByCount.slice(0, 5);
  const moreDisciplineNames = disciplinesByCount.slice(5, 8).map((d) => d.name);

  return (
    <>
      {/* Hero — full-bleed photo with a gradient scrim, an oversized bold
          headline overlapping the photo directly, and a plain (non-floating)
          search row in the normal page flow below it. */}
      <section className="bg-ink">
        <div className="photo-caption photo-caption-hero relative min-h-[620px] sm:h-[65vh] sm:min-h-[480px] lg:h-[70vh]">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL, not worth next/image remote-pattern config yet */}
          <img
            src="https://images.unsplash.com/photo-1512934772407-b292436089ee?auto=format&fit=crop&w=1600&q=85"
            alt="A rider jumping a horse over a rail with mountains behind"
            className="absolute inset-0 h-full w-full object-cover object-[30%_30%]"
          />
          <div className="hero-sash" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:pb-14">
            <div className="flex flex-wrap gap-1.5">
              <span className="pennant inline-flex items-center bg-brass px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brass-fg">
                Every discipline
              </span>
              <span className="pennant inline-flex items-center bg-ink-fg/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ink-fg)_50%,transparent)]">
                Every state
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[0.98] text-ink-fg sm:text-6xl lg:text-7xl xl:text-[80px]">
              Find your perfect riding coach, nearby.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-fg/90">
              Search coaches across Australia by discipline and location —
              liberty, bridleless, working equitation and every other
              discipline.
            </p>
          </div>
        </div>

        <div className="bg-bg">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <SearchBar skills={skills} attributes={attributes} />
            <div className="mt-3 text-[15px] text-muted">
              <strong className="text-ink">{disciplines.length}</strong>{" "}
              disciplines listed, from dressage to liberty
            </div>
          </div>
        </div>
      </section>

      {/* Featured disciplines */}
      <section className="bg-shade">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                Featured disciplines
              </div>
              <h2 className="mt-4 max-w-xl text-4xl leading-[1.05] text-ink sm:text-5xl">
                Start with the discipline you ride.
              </h2>
            </div>
            <p className="max-w-sm text-lg leading-relaxed text-muted">
              Coaches are listed by the disciplines they actually teach, not by
              keyword.
            </p>
          </div>

          <div className="mt-12">
            <DisciplineBentoTeaser
              disciplines={bentoDisciplines}
              moreNames={moreDisciplineNames}
              total={disciplines.length}
            />
          </div>
        </div>
      </section>

      {/* Featured coaches */}
      <section className="bg-bg">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                Featured coaches
              </div>
              <h2 className="mt-4 text-4xl leading-[1.05] text-ink sm:text-5xl">
                Coaches taking riders now.
              </h2>
            </div>
            <LinkButton
              href="/search"
              variant="ghost"
              className="hidden shrink-0 sm:inline-flex"
            >
              See all coaches →
            </LinkButton>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((coach) => (
              <CoachCard key={coach.slug} coach={coach} />
            ))}
          </div>
          <LinkButton
            href="/search"
            variant="secondary"
            className="mt-8 w-full sm:hidden"
          >
            See all coaches
          </LinkButton>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink text-ink-fg">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="max-w-xl text-4xl leading-[1.05] text-ink-fg sm:text-5xl">
            Three steps to a lesson.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Search your discipline",
                body: "Pick what you ride and the town you ride in. Every listing is a real coach, not an agency.",
              },
              {
                n: "02",
                title: "Read the profile",
                body: "Qualifications, disciplines, travel radius, testimonials from riders they've taught.",
              },
              {
                n: "03",
                title: "Contact them direct",
                body: "No commission, no booking fee. You deal with your coach, the way riders always have.",
              },
            ].map((step) => (
              <div key={step.n} className="border-t border-ink-fg/35 pt-6">
                <div className="text-2xl text-border">{step.n}</div>
                <div className="mt-3 text-2xl font-medium text-ink-fg">
                  {step.title}
                </div>
                <p className="mt-2.5 text-[17px] leading-relaxed text-ink-fg/82">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach CTA */}
      <section className="border-t border-border bg-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-14 sm:flex-row sm:items-center sm:px-6 sm:py-16">
          <div className="max-w-xl">
            <h2 className="text-3xl leading-[1.05] text-ink sm:text-4xl">
              Coaching professionally?
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-muted">
              List from <strong className="text-ink">$9.99 a month</strong> —
              bio, photo, location, specialties, qualifications and
              testimonials. <strong className="text-ink">$14.95</strong> adds
              your clinics and events.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <LinkButton href="/for-coaches" className="w-full sm:w-auto">
              List your coaching profile
            </LinkButton>
            <LinkButton
              href="/for-coaches"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              See pricing
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
