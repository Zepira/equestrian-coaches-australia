import { notFound } from "next/navigation";
import Link from "next/link";
import { DisciplineTag } from "@/components/discipline-tag";
import { Button } from "@/components/ui/button";
import { FavouriteButton } from "@/components/favourite-button";
import { JsonLd } from "@/components/json-ld";
import { CoachContactSection } from "@/components/coach-contact-section";
import { createClient } from "@/lib/supabase/server";
import { getCoachBySlug, placeholderCoaches } from "@/lib/placeholder-coaches";
import { getMockCoachBySlug, SKILL_NAMES, ATTRIBUTE_NAMES } from "@/lib/mock-coaches";
import { getDisciplineBySlug } from "@/lib/disciplines";
import { breadcrumbSchema, coachPersonSchema } from "@/lib/structured-data";

export function generateStaticParams() {
  return placeholderCoaches.map((c) => ({ slug: c.slug }));
}

type CoachView = {
  id: string | null;
  // Identifier to submit the contact form against — coach.id for a real DB
  // coach; a "mock:<slug>" sentinel for a demo/mock coach with the form
  // switched on (sendCoachEnquiry short-circuits on that prefix rather than
  // looking up a row that doesn't exist); null when there's no form to show.
  contactId: string | null;
  slug: string;
  name: string;
  suburb: string;
  state: string;
  lat: number | null;
  long: number | null;
  headline: string;
  bio: string;
  disciplineSlugs: string[];
  skillNames: string[];
  attributeNames: string[];
  qualifications: string[];
  testimonials: { quote: string; author: string }[];
  clinics: { id: string | null; title: string; date: string; location: string }[];
  photoUrl: string | null;
  canListClinics: boolean;
  contact: {
    email: string | null;
    phone: string | null;
    facebookUrl: string | null;
    showContactForm: boolean;
  };
};

const noContact = { email: null, phone: null, facebookUrl: null, showContactForm: false };

type TermJoinRow = { terms: { slug: string; name: string; kind: string } | null };

// coach_terms rows come back as one flat array across all three kinds
// (discipline/skill/attribute) — this pulls out just one kind's slug or
// name, replacing what was three near-identical
// .map().filter().map() chains in getCoachFromDb below.
function termsOfKind(rows: unknown[] | null, kind: string, field: "slug" | "name"): string[] {
  return ((rows ?? []) as TermJoinRow[])
    .map((r) => r.terms)
    .filter((t): t is { slug: string; name: string; kind: string } => t !== null && t.kind === kind)
    .map((t) => t[field]);
}

async function getCoachFromDb(slug: string): Promise<CoachView | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select(
      "id, headline, bio, suburb, state, lat, long, qualifications, subscription_tier, published, contact_email, contact_phone, facebook_url, show_contact_email, show_contact_phone, show_facebook, show_contact_form, profiles!coach_profiles_id_fkey(name)"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!coach) return null;

  const [{ data: disciplineRows }, { data: testimonialRows }, { data: clinicRows }, { data: photoRows }] =
    await Promise.all([
      supabase
        .from("coach_terms")
        .select("terms(slug, name, kind)")
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
    contactId: coach.id,
    slug,
    name: profileName ?? "Coach",
    suburb: coach.suburb,
    state: coach.state,
    lat: coach.lat,
    long: coach.long,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: termsOfKind(disciplineRows, "discipline", "slug"),
    skillNames: termsOfKind(disciplineRows, "skill", "name"),
    attributeNames: termsOfKind(disciplineRows, "attribute", "name"),
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
    contact: {
      email: coach.show_contact_email && coach.contact_email ? coach.contact_email : null,
      phone: coach.show_contact_phone && coach.contact_phone ? coach.contact_phone : null,
      facebookUrl: coach.show_facebook && coach.facebook_url ? coach.facebook_url : null,
      showContactForm: coach.show_contact_form,
    },
  };
}

// Mock data lookup — see src/lib/mock-coaches.ts to remove.
function getCoachFromMock(slug: string): CoachView | null {
  const coach = getMockCoachBySlug(slug);
  if (!coach) return null;
  return {
    id: null,
    contactId: coach.contact.showContactForm ? `mock:${coach.slug}` : null,
    slug: coach.slug,
    name: coach.name,
    suburb: coach.suburb,
    state: coach.state,
    lat: coach.lat,
    long: coach.long,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: coach.disciplineSlugs,
    skillNames: coach.skillSlugs.map((s) => SKILL_NAMES[s] ?? s),
    attributeNames: coach.attributeSlugs.map((s) => ATTRIBUTE_NAMES[s] ?? s),
    qualifications: coach.qualifications,
    testimonials: [],
    clinics: [],
    photoUrl: coach.photoUrl,
    canListClinics: coach.tier === "standard_plus_clinics",
    contact: coach.contact,
  };
}

function getCoachFromPlaceholder(slug: string): CoachView | null {
  const coach = getCoachBySlug(slug);
  if (!coach) return null;
  return {
    id: null,
    contactId: null,
    slug: coach.slug,
    name: coach.name,
    suburb: coach.suburb,
    state: coach.state,
    lat: null,
    long: null,
    headline: coach.headline,
    bio: coach.bio,
    disciplineSlugs: coach.disciplines,
    skillNames: [],
    attributeNames: [],
    qualifications: coach.qualifications,
    testimonials: coach.testimonials,
    clinics: coach.clinics.map((c) => ({ ...c, id: null })),
    photoUrl: null,
    canListClinics: coach.tier === "standard_plus_clinics",
    contact: noContact,
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

  const disciplineNames = coach.disciplineSlugs
    .map((s) => getDisciplineBySlug(s)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <JsonLd
        data={[
          coachPersonSchema({
            name: coach.name,
            slug: coach.slug,
            headline: coach.headline,
            bio: coach.bio,
            suburb: coach.suburb,
            state: coach.state,
            lat: coach.lat,
            long: coach.long,
            photoUrl: coach.photoUrl,
            disciplineNames,
            skillNames: coach.skillNames,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Find a coach", url: "/search" },
            { name: coach.name, url: `/coaches/${coach.slug}` },
          ]),
        ]}
      />
      <div
        className="h-48 w-full rounded-[var(--radius-tile)] bg-accent-soft bg-cover bg-center sm:h-72"
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

      {(coach.skillNames.length > 0 || coach.attributeNames.length > 0) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fg">Skills &amp; setup</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {coach.skillNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-fg"
              >
                {name}
              </span>
            ))}
            {coach.attributeNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-transparent bg-shade px-3 py-1 text-sm text-fg"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

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
              <div key={clinic.id ?? clinic.title} className="rounded-[var(--radius-tile)] border border-border bg-surface p-4">
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

      <CoachContactSection contact={coach.contact} contactId={coach.contactId} coachName={coach.name} />
    </div>
  );
}
