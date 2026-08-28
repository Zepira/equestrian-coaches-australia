import { notFound } from "next/navigation";
import { DisciplineTag } from "@/components/discipline-tag";
import { Button, LinkButton } from "@/components/ui/button";
import { getCoachBySlug, placeholderCoaches } from "@/lib/placeholder-coaches";

export function generateStaticParams() {
  return placeholderCoaches.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = getCoachBySlug(slug);
  return { title: coach ? coach.name : "Coach not found" };
}

export default async function CoachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = getCoachBySlug(slug);
  if (!coach) notFound();

  const canListClinics = coach.tier === "standard_plus_clinics";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="h-48 w-full rounded-lg bg-accent-soft sm:h-72" aria-hidden />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">{coach.name}</h1>
          <p className="text-muted">
            {coach.suburb} {coach.state}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {coach.disciplines.map((slug) => (
              <DisciplineTag key={slug} slug={slug} />
            ))}
          </div>
        </div>
        {/* Favouriting requires a rider account — wired up once auth ships (phase 2/7) */}
        <Button variant="secondary" className="shrink-0">
          ♡ Favourite
        </Button>
      </div>

      <p className="mt-6 text-lg text-fg">{coach.headline}</p>
      <p className="mt-3 text-muted">{coach.bio}</p>

      {coach.qualifications.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fg">Qualifications</h2>
          <ul className="mt-2 list-inside list-disc text-muted">
            {coach.qualifications.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {coach.testimonials.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fg">Testimonials</h2>
          <div className="mt-3 flex flex-col gap-3">
            {coach.testimonials.map((t) => (
              <blockquote
                key={t.quote}
                className="border-l-2 border-accent pl-4 text-fg"
              >
                “{t.quote}”
                <footer className="mt-1 text-sm text-muted">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {canListClinics && coach.clinics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fg">Upcoming clinics</h2>
          <div className="mt-3 flex flex-col gap-2">
            {coach.clinics.map((clinic) => (
              <div key={clinic.title} className="rounded-lg border border-border bg-surface p-4">
                <div className="font-semibold text-fg">{clinic.title}</div>
                <div className="text-sm text-muted">
                  {new Date(clinic.date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {clinic.location}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-fg">Get in touch</h2>
        <p className="mt-1 text-sm text-muted">
          Enquiry form coming soon — for now, coaches are contacted directly.
        </p>
        <LinkButton href="/search" variant="secondary" className="mt-4">
          ← Back to search
        </LinkButton>
      </section>
    </div>
  );
}
