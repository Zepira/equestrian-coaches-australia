import { Hero } from "@/components/hero";
import { CoachCard } from "@/components/coach-card";
import { DisciplineTag } from "@/components/discipline-tag";
import { LinkButton } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import {
  searchCoaches,
  getSkills,
  getAttributes,
} from "@/lib/supabase/queries";
import { searchMockCoaches, disciplinePhoto } from "@/lib/mock-coaches";

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const [featured, skills, attributes] = await Promise.all([
    supabase
      ? [
          ...(await searchCoaches(supabase, {})),
          ...searchMockCoaches({}),
        ].slice(0, 4)
      : placeholderCoaches.slice(0, 4).map(toCoachCardData),
    getSkills(supabase),
    getAttributes(supabase),
  ]);
  const topDisciplines = disciplines.slice(0, 3);
  const moreDisciplines = disciplines.slice(3, 9);

  return (
    <>
      <Hero skills={skills} attributes={attributes} />

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

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {topDisciplines.map((d) => (
              <a key={d.slug} href={`/disciplines/${d.slug}`} className="group">
                <div className="arch-crop h-64 bg-border sm:h-80">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash URL */}
                  <img
                    src={disciplinePhoto(d.slug)}
                    alt={d.name}
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
                <h3 className="mt-6 text-2xl font-medium text-ink">{d.name}</h3>
                <p className="mt-1 text-[17px] leading-relaxed text-muted">
                  {d.blurb}
                </p>
              </a>
            ))}
          </div>

          <div className="mt-11 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2.5">
              {moreDisciplines.map((d) => (
                <DisciplineTag key={d.slug} slug={d.slug} />
              ))}
            </div>
            <LinkButton href="/search" variant="ghost" className="shrink-0">
              All disciplines →
            </LinkButton>
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
