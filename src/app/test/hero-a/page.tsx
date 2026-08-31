import { CoachCard } from "@/components/coach-card";
import { DisciplineTag } from "@/components/discipline-tag";
import { LinkButton } from "@/components/ui/button";
import { disciplines } from "@/lib/disciplines";
import { placeholderCoaches, toCoachCardData } from "@/lib/placeholder-coaches";
import { createClient } from "@/lib/supabase/server";
import { searchCoaches } from "@/lib/supabase/queries";
import { searchMockCoaches, disciplinePhoto } from "@/lib/mock-coaches";
import { HideSiteHeader } from "@/components/test/hide-site-header";

// TEST PAGE — matches Claude Design "Paddock Edit - Hero Options", Turn 2,
// option 2a: "Flush split — green header". Solid ink-green header bar above
// a cream/photo split hero, boxed search card, pill row, stat row, dark
// image-caption strip docked under the photo. Hero content is right-aligned,
// sitting near the page centre rather than hugging the left edge. Sections
// below the hero are the same real content as the homepage.
// Delete this whole /test folder (and src/components/test/) when done comparing.
export default async function HeroA() {
  const shown = disciplines.slice(0, 3);
  const supabase = await createClient();
  const featured = supabase
    ? [...(await searchCoaches(supabase, {})), ...searchMockCoaches({})].slice(0, 4)
    : placeholderCoaches.slice(0, 4).map(toCoachCardData);
  const topDisciplines = disciplines.slice(0, 3);
  const moreDisciplines = disciplines.slice(3, 9);

  return (
    <>
      <HideSiteHeader />
      <header className="bg-ink text-ink-fg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em]">
            Equestrian Coaches Australia
          </div>
          <nav className="hidden items-center gap-8 text-[15px] sm:flex">
            <a href="#">Find a coach</a>
            <a href="#">Disciplines</a>
            <a href="#">For coaches</a>
            <a href="#">Log in</a>
          </nav>
          <a
            href="#"
            className="rounded-[var(--radius-control)] bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            List your profile
          </a>
        </div>
        <div className="h-[3px] bg-accent" />
      </header>

      {/* Hero */}
      <section className="grid lg:grid-cols-2">
        <div className="flex justify-end bg-bg px-4 py-14 sm:px-10 sm:py-20">
          <div className="max-w-xl text-right">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Coaching, discipline by discipline
            </div>
            <h1 className="mt-6 text-6xl leading-[0.98] text-ink lg:text-[68px]">
              Find your perfect riding coach, nearby.
            </h1>
            <p className="mt-6 ml-auto max-w-lg text-lg leading-relaxed text-muted">
              Search verified coaches across Australia by discipline and
              location — liberty, bridleless, working equitation and every
              other discipline.
            </p>

            <div className="mt-8 rounded-[var(--radius-tile)] bg-white p-2 text-left shadow-sm">
              <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
                <div className="flex-1 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                    Discipline
                  </div>
                  <div className="mt-1 text-[15px] text-ink">Any discipline</div>
                </div>
                <div className="flex-1 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                    Suburb
                  </div>
                  <div className="mt-1 text-[15px] text-muted">e.g. Bendigo VIC</div>
                </div>
              </div>
              <button className="mt-2 w-full rounded-[var(--radius-control)] bg-ink py-3.5 text-[15px] font-semibold text-ink-fg">
                Find a coach
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              {shown.map((d) => (
                <span
                  key={d.slug}
                  className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-ink"
                >
                  {d.name}
                </span>
              ))}
              <span className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink">
                All {disciplines.length} →
              </span>
            </div>

            <div className="mt-8 flex justify-end gap-8 text-[15px]">
              <div>
                <strong className="text-lg text-accent">412</strong>{" "}
                <span className="text-muted">verified coaches</span>
              </div>
              <div>
                <strong className="text-lg text-accent">{disciplines.length}</strong>{" "}
                <span className="text-muted">disciplines</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element -- test mockup, real vetted show-jumping photo already used in mock-coaches.ts */}
          <img
            src="https://images.unsplash.com/photo-1613085411234-9c83af5562d8?auto=format&fit=crop&w=1600&q=85"
            alt="A rider jumping a horse at a competition"
            className="min-h-0 flex-1 w-full object-cover"
          />
          <div className="flex shrink-0 items-center justify-between bg-ink px-6 py-4 text-sm text-ink-fg">
            <span className="uppercase tracking-[0.15em]">
              Coaches taking riders now
            </span>
            <span className="font-semibold">See this week&apos;s listings →</span>
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
