import type { Viewport } from "next";
import { Hero } from "@/components/hero";
import { SearchBar } from "@/components/search-bar";
import { CoachCard } from "@/components/coach-card";
import { DisciplineTag } from "@/components/discipline-tag";
import { DisciplineMasonry } from "@/components/discipline-masonry";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches, getSkills, getAttributes } from "@/lib/supabase/queries";
import { searchMockCoaches } from "@/lib/mock-coaches";

// Overrides the root layout's cream themeColor (src/app/layout.tsx) — this
// is the one route whose own top edge is the dark hero, not the cream
// header every other page opens with.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f3a2e",
};

export default async function Home() {
  const supabase = await createClient();
  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const [featured, skills, attributes] = await Promise.all([
    supabase
      ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})].slice(0, 4)
      : placeholderCoaches.slice(0, 4).map(toCoachCardData),
    getSkills(supabase),
    getAttributes(supabase),
  ]);
  const topDisciplines = disciplines.slice(0, 3);
  const moreDisciplines = disciplines.slice(3, 9);

  return (
    <>
      <Hero
        eyebrow="Coaching, discipline by discipline"
        title="Find your perfect riding coach, nearby."
        lead="Search coaches across Australia by discipline and location — dressage to bridleless, city arenas to bush tracks."
        stats={[
          { value: String(disciplines.length), label: "disciplines listed" },
          { value: "Free", label: "for riders, always" },
        ]}
      >
        <SearchBar skills={skills} attributes={attributes} tone="dark" />
      </Hero>

      {/* Featured coaches */}
      <section className="bg-bg">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow-line text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                Featured coaches
              </div>
              <h2 className="mt-4 text-4xl leading-[1.05] text-ink sm:text-5xl">
                Coaches taking riders now.
              </h2>
            </div>
            <LinkButton href="/search" variant="ghost" className="hidden shrink-0 sm:inline-flex">
              See all coaches →
            </LinkButton>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((coach, i) => (
              <Reveal key={coach.slug} delay={i * 80}>
                <CoachCard coach={coach} />
              </Reveal>
            ))}
          </div>
          <LinkButton href="/search" variant="secondary" className="mt-8 w-full sm:hidden">
            See all coaches
          </LinkButton>
        </div>
      </section>

      {/* Featured disciplines */}
      <section className="bg-shade">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="eyebrow-line text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                Featured disciplines
              </div>
              <h2 className="mt-4 max-w-xl text-4xl leading-[1.05] text-ink sm:text-5xl">
                Start with the discipline you ride.
              </h2>
            </div>
            <p className="max-w-sm text-lg leading-relaxed text-muted">
              Coaches are listed by the disciplines they actually teach, not by keyword.
            </p>
          </Reveal>

          <Reveal delay={100} className="mt-12">
            <DisciplineMasonry disciplines={topDisciplines} />
          </Reveal>

          <Reveal
            delay={150}
            className="mt-11 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 sm:flex-row sm:items-center"
          >
            <div className="flex flex-wrap gap-2.5">
              {moreDisciplines.map((d) => (
                <DisciplineTag key={d.slug} slug={d.slug} />
              ))}
            </div>
            <LinkButton href="/search" variant="ghost" className="shrink-0">
              All disciplines →
            </LinkButton>
          </Reveal>

          {/* Coach CTA — sits directly under the disciplines it's meant to
              follow on from, not stranded at the very bottom of the page. */}
          <Reveal
            delay={200}
            className="mt-11 flex flex-col items-start justify-between gap-6 rounded-[var(--radius-tile)] bg-ink px-6 py-8 sm:flex-row sm:items-center sm:px-10"
          >
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-fg/90 sm:text-base">
              <strong className="text-ink-fg">Coaches:</strong>{" "}
              <strong className="text-ink-fg">$9.99 a month</strong> for a full profile — bio, photo,
              location, specialties, qualifications and testimonials.{" "}
              <strong className="text-ink-fg">$14.95</strong> adds your clinics and events.
            </p>
            <Magnetic className="w-full shrink-0 sm:w-auto">
              <LinkButton href="/for-coaches" className="w-full sm:w-auto">
                List your coaching profile
              </LinkButton>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink text-ink-fg">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="max-w-xl text-4xl leading-[1.05] text-ink-fg sm:text-5xl">
              Three steps to a lesson.
            </h2>
          </Reveal>
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
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 100}>
                <div className="border-t border-ink-fg/35 pt-6">
                  <div className="text-2xl text-border">{step.n}</div>
                  <div className="mt-3 text-2xl font-medium text-ink-fg">{step.title}</div>
                  <p className="mt-2.5 text-[17px] leading-relaxed text-ink-fg/82">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
