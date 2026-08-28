import { notFound } from "next/navigation";
import Link from "next/link";
import { DisciplineTag } from "@/components/discipline-tag";
import { Button, LinkButton } from "@/components/ui/button";
import { FavouriteButton } from "@/components/favourite-button";
import { createClient } from "@/lib/supabase/server";
import { getCoachBySlug, placeholderCoaches } from "@/lib/placeholder-coaches";
import { getMockCoachBySlug } from "@/lib/mock-coaches";

export function generateStaticParams() {
  return placeholderCoaches.map((c) => ({ slug: c.slug }));
}

type CoachView = {
  id: string | null;
  slug: string;
  name: string;
  suburb: string;
  state: string;
  headline: string;
  bio: string;
  disciplineSlugs: string[];
  qualifications: string[];
  testimonials: { quote: string; author: string }[];
  clinics: { id: string | null; title: string; date: string; location: string }[];
  photoUrl: string | null;
  canListClinics: boolean;
};

async function getCoachFromDb(slug: string): Promise<CoachView | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select(
      "id, headline, bio, suburb, state, qualifications, subscription_tier, published, profiles!coach_profiles_id_fkey(name)"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!coach) return null;

  const [{ data: disciplineRows }, { data: testimonialRows }, { data: clinicRows }, { data: photoRows }] =
    await Promise.all([
      supabase
        .from("coach_terms")
        .select("terms(slug, kind)")
        .eq("coach_id", coach.id),
      supabase.from("testimonials").select("quote, author_name").eq("coach_id", coach.id),
      supabase
        .from("clinics")
        .select("id, title, start_date, location_text")
        .eq("coach_id", coach.id)
        .order("start_date"),
      supabase
        .from("coach_photos")
        .select("storage_path")
        .eq("coach_id", coach.id)
        .order("sort_order")
        .limit(1),
    ]);

  const profileName = (coach as unknown as { profiles: { name: string } | null }).profiles?.name;

  return {
    id: coach.id,
    slug,
    name: profileName ?? "Coach",
    suburb: coach.suburb,
    state: coach.state,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: (disciplineRows ?? [])
      .map((r) => (r as unknown as { terms: { slug: string; kind: string } | null }).terms)
      .filter((t): t is { slug: string; kind: string } => Boolean(t) && t!.kind === "discipline")
      .map((t) => t.slug),
    qualifications: coach.qualifications ?? [],
    testimonials: (testimonialRows ?? []).map((t) => ({ quote: t.quote, author: t.author_name })),
    clinics: (clinicRows ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      date: c.start_date,
      location: c.location_text,
    })),
    photoUrl: photoRows?.[0]
      ? supabase.storage.from("coach-photos").getPublicUrl(photoRows[0].storage_path).data.publicUrl
      : null,
    canListClinics: coach.subscription_tier === "standard_plus_clinics",
  };
}

// Mock data lookup — see src/lib/mock-coaches.ts to remove.
function getCoachFromMock(slug: string): CoachView | null {
  const coach = getMockCoachBySlug(slug);
  if (!coach) return null;
  return {
    id: null,
    slug: coach.slug,
    name: coach.name,
    suburb: coach.suburb,
    state: coach.state,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: coach.disciplineSlugs,
    qualifications: coach.qualifications,
    testimonials: [],
    clinics: [],
    photoUrl: coach.photoUrl,
    canListClinics: coach.tier === "standard_plus_clinics",
  };
}

function getCoachFromPlaceholder(slug: string): CoachView | null {
  const coach = getCoachBySlug(slug);
  if (!coach) return null;
  return {
    id: null,
    slug: coach.slug,
    name: coach.name,
    suburb: coach.suburb,
    state: coach.state,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: coach.disciplines,
    qualifications: coach.qualifications,
    testimonials: coach.testimonials,
    clinics: coach.clinics.map((c) => ({ ...c, id: null })),
    photoUrl: null,
    canListClinics: coach.tier === "standard_plus_clinics",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = (await getCoachFromDb(slug)) ?? getCoachFromMock(slug) ?? getCoachFromPlaceholder(slug);
  if (!coach) return { title: "Coach not found" };
  return {
    title: coach.name,
    description: `${coach.headline} ${coach.suburb} ${coach.state}.`,
  };
}

export default async function CoachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = (await getCoachFromDb(slug)) ?? getCoachFromMock(slug) ?? getCoachFromPlaceholder(slug);
  if (!coach) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div
        className="h-48 w-full rounded-lg bg-accent-soft bg-cover bg-center sm:h-72"
        style={coach.photoUrl ? { backgroundImage: `url(${coach.photoUrl})` } : undefined}
        aria-hidden
      />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">{coach.name}</h1>
          <p className="text-muted">
            {coach.suburb} {coach.state}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {coach.disciplineSlugs.map((slug) => (
              <DisciplineTag key={slug} slug={slug} />
            ))}
          </div>
        </div>
        {coach.id ? (
          <FavouriteButton coachId={coach.id} coachSlug={coach.slug} />
        ) : (
          <Button variant="secondary" className="shrink-0" disabled>
            ♡ Favourite
          </Button>
        )}
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
              <blockquote key={t.quote} className="border-l-2 border-accent pl-4 text-fg">
                “{t.quote}”
                <footer className="mt-1 text-sm text-muted">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {coach.canListClinics && coach.clinics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fg">Upcoming clinics</h2>
          <div className="mt-3 flex flex-col gap-2">
            {coach.clinics.map((clinic) => (
              <div key={clinic.id ?? clinic.title} className="rounded-lg border border-border bg-surface p-4">
                {clinic.id ? (
                  <Link href={`/clinics/${clinic.id}`} className="font-semibold text-fg hover:text-accent">
                    {clinic.title}
                  </Link>
                ) : (
                  <div className="font-semibold text-fg">{clinic.title}</div>
                )}
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
