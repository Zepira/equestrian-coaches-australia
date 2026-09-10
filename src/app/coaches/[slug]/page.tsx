import { notFound } from "next/navigation";
import Link from "next/link";
import { FavouriteButton } from "@/components/favourite-button";
import { JsonLd } from "@/components/json-ld";
import { ContactForm } from "@/components/contact-form";
import { EnquirySheet } from "@/components/enquiry-sheet";
import { PhoneReveal } from "@/components/phone-reveal";
import { BackToResults } from "@/components/back-to-results";
import { createClient } from "@/lib/supabase/server";
import { getCoachBySlug, placeholderCoaches } from "@/lib/placeholder-coaches";
import { getMockCoachBySlug, SKILL_NAMES, ATTRIBUTE_NAMES } from "@/lib/mock-coaches";
import { getDisciplineBySlug } from "@/lib/disciplines";
import { breadcrumbSchema, coachPersonSchema } from "@/lib/structured-data";
import { logView } from "@/lib/coach-events";

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
  clinics: { id: string | null; title: string; date: string; location: string; placesLeft: number | null }[];
  photoUrl: string | null;
  videoUrl: string | null;
  canListClinics: boolean;
  takingStudents: "yes" | "waitlist" | "no";
  travelRadiusKm: number | null;
  yearsCoaching: number | null;
  /** Attribute name → the coach's own one-line detail, when they wrote one. */
  setupDetails: Record<string, string>;
  contact: {
    email: string | null;
    /** The number itself is never sent to the page — see PhoneReveal. */
    hasPhone: boolean;
    facebookUrl: string | null;
    showContactForm: boolean;
  };
};

const noContact = { email: null, hasPhone: false, facebookUrl: null, showContactForm: false };

async function getCoachFromDb(slug: string): Promise<CoachView | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select(
      "id, headline, bio, suburb, state, lat, long, qualifications, subscription_tier, video_url, published, taking_students, travel_radius_km, years_coaching, contact_email, contact_phone, facebook_url, show_contact_email, show_contact_phone, show_facebook, show_contact_form, profiles!coach_profiles_id_fkey(name)"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!coach) return null;

  const [{ data: disciplineRows }, { data: testimonialRows }, { data: clinicRows }, { data: photoRows }] =
    await Promise.all([
      supabase
        .from("coach_terms")
        .select("detail, terms(slug, name, kind)")
        .eq("coach_id", coach.id),
      supabase.from("testimonials").select("quote, author_name").eq("coach_id", coach.id),
      supabase
        .from("clinics")
        .select("id, title, start_date, location_text, places_left")
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
    disciplineSlugs: (disciplineRows ?? [])
      .map((r) => (r as unknown as { terms: { slug: string; kind: string } | null }).terms)
      .filter((t): t is { slug: string; kind: string } => Boolean(t) && t!.kind === "discipline")
      .map((t) => t.slug),
    skillNames: (disciplineRows ?? [])
      .map((r) => (r as unknown as { terms: { name: string; kind: string } | null }).terms)
      .filter((t): t is { name: string; kind: string } => Boolean(t) && t!.kind === "skill")
      .map((t) => t.name),
    attributeNames: (disciplineRows ?? [])
      .map((r) => (r as unknown as { terms: { name: string; kind: string } | null }).terms)
      .filter((t): t is { name: string; kind: string } => Boolean(t) && t!.kind === "attribute")
      .map((t) => t.name),
    qualifications: coach.qualifications ?? [],
    testimonials: (testimonialRows ?? []).map((t) => ({ quote: t.quote, author: t.author_name })),
    clinics: (clinicRows ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      date: c.start_date,
      location: c.location_text,
      placesLeft: (c as { places_left?: number | null }).places_left ?? null,
    })),
    photoUrl: photoRows?.[0]
      ? supabase.storage.from("coach-photos").getPublicUrl(photoRows[0].storage_path).data.publicUrl
      : null,
    videoUrl: coach.video_url,
    canListClinics: coach.subscription_tier === "standard_plus_clinics",
    takingStudents: (coach.taking_students as CoachView["takingStudents"]) ?? "yes",
    travelRadiusKm: coach.travel_radius_km ?? null,
    yearsCoaching: coach.years_coaching ?? null,
    setupDetails: Object.fromEntries(
      (disciplineRows ?? [])
        .map((r) => r as unknown as { detail: string | null; terms: { name: string; kind: string } | null })
        .filter((r) => r.terms?.kind === "attribute" && r.detail)
        .map((r) => [r.terms!.name, r.detail as string])
    ),
    contact: {
      email: coach.show_contact_email && coach.contact_email ? coach.contact_email : null,
      hasPhone: Boolean(coach.show_contact_phone && coach.contact_phone),
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
    videoUrl: null,
    canListClinics: coach.tier === "standard_plus_clinics",
    takingStudents: coach.takingStudents,
    travelRadiusKm: coach.travelRadiusKm,
    yearsCoaching: coach.yearsCoaching,
    setupDetails: coach.setupDetails,
    contact: {
      email: coach.contact.email,
      hasPhone: coach.contact.phone != null,
      facebookUrl: coach.contact.facebookUrl,
      showContactForm: coach.contact.showContactForm,
    },
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
    clinics: coach.clinics.map((c) => ({ ...c, id: null, placesLeft: null })),
    photoUrl: null,
    videoUrl: null,
    canListClinics: coach.tier === "standard_plus_clinics",
    takingStudents: "yes",
    travelRadiusKm: null,
    yearsCoaching: null,
    setupDetails: {},
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatusPill({ status, className = "" }: { status: CoachView["takingStudents"]; className?: string }) {
  const label = status === "yes" ? "Taking new students" : status === "waitlist" ? "Waitlist open" : "Not taking students right now";
  return (
    <span className={`fade-in inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-3 py-[7px] text-[12px] font-medium text-ink-fg ${className}`} style={{ animationDuration: "0.6s" }}>
      <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${status === "yes" ? "bg-success" : status === "waitlist" ? "bg-peach" : "bg-ink-fg/40"}`} />
      {label}
    </span>
  );
}

export default async function CoachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = (await getCoachFromDb(slug)) ?? getCoachFromMock(slug) ?? getCoachFromPlaceholder(slug);
  if (!coach) notFound();
  if (coach.id) await logView(coach.id); // real coaches only; deduped per visitor per day

  const disciplineNames = coach.disciplineSlugs
    .map((s) => getDisciplineBySlug(s)?.name)
    .filter((n): n is string => Boolean(n));
  const firstName = coach.name.split(" ")[0];
  const [nameFirst, ...nameRest] = coach.name.split(" ");
  const canEnquire = Boolean(coach.contactId && coach.contact.showContactForm);
  // No form at all for a coach who has closed their books — the aside and
  // the sheet both explain instead (the server action refuses too).
  const enquiryId = canEnquire && coach.takingStudents !== "no" ? coach.contactId : null;
  const whereBits = [
    <span key="based">
      Based in <strong className="font-medium text-fg">{coach.suburb} {coach.state}</strong>
    </span>,
    ...(coach.travelRadiusKm && coach.travelRadiusKm > 0 ? [<span key="travel">travels up to {coach.travelRadiusKm} km</span>] : []),
    ...(coach.yearsCoaching ? [<span key="years">{coach.yearsCoaching} year{coach.yearsCoaching === 1 ? "" : "s"} coaching</span>] : []),
  ];
  const nextClinic = coach.canListClinics
    ? coach.clinics.find((c) => new Date(c.date) >= new Date(new Date().toDateString())) ?? null
    : null;
  const clinicDate = nextClinic ? new Date(nextClinic.date) : null;
  const setupTiles = coach.attributeNames.map((name) => ({ k: name, v: coach.setupDetails[name] ?? null }));

  return (
    <div className="coach-profile">
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

      {/* ── phone-only top bar over the photo (the desktop header carries
             "← Back to results" itself) ─────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between bg-[linear-gradient(180deg,rgba(13,24,18,.6),rgba(13,24,18,0))] px-[18px] pt-[var(--safe-top)] text-ink-fg wide:hidden">
        <BackToResults className="flex items-center gap-2 text-[14px] font-medium text-ink-fg [&>span]:flex [&>span]:h-9 [&>span]:w-9 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-[999px] [&>span]:bg-ink-deep/55 [&>span]:backdrop-blur-[6px]" />
        <FavouriteButton coachId={coach.id} coachSlug={coach.slug} shape="icon" />
      </div>

      <div className="mx-auto wide:grid wide:max-w-[1184px] wide:grid-cols-[1fr_400px] wide:items-start wide:gap-14 wide:px-12 wide:pb-20 wide:pt-9">
        <div className="wide:min-w-0">
          {/* ── photo + name block ──────────────────────────────────── */}
          <div className="wide:grid wide:grid-cols-[300px_1fr] wide:items-end wide:gap-9">
            <div className="coach-photo fade-in relative h-[440px] overflow-hidden bg-ink-deep wide:aspect-[4/5] wide:h-auto wide:rounded-t-[150px] wide:rounded-b-[16px] wide:bg-shade" style={{ animationDuration: "0.7s" }}>
              {coach.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.photoUrl} alt="" className="coach-photo__img block h-full w-full object-cover object-[50%_30%]" />
              ) : null}
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,24,18,.15),rgba(13,24,18,0)_35%,rgba(246,241,231,0)_70%,#f6f1e7_100%)] wide:hidden" />
            </div>
            <div className="relative -mt-14 px-[18px] wide:mt-0 wide:px-0 wide:pb-2">
              <StatusPill status={coach.takingStudents} />
              <h1 className="fade-in mt-3.5 text-[46px] leading-[0.98] -tracking-[0.025em] text-ink wide:mt-4 wide:text-[68px] wide:leading-[0.95] wide:-tracking-[0.03em]" style={{ animationDuration: "0.7s", animationDelay: "0.05s" }}>
                <span className="wide:hidden">{coach.name}</span>
                <span className="hidden wide:inline">
                  {nameFirst}
                  {nameRest.length > 0 && (
                    <>
                      <br />
                      {nameRest.join(" ")}
                    </>
                  )}
                </span>
              </h1>
              <p className="fade-in mt-2.5 text-[16px] leading-[1.4] text-muted wide:mt-3.5 wide:text-[17px]" style={{ animationDuration: "0.7s", animationDelay: "0.1s" }}>
                {whereBits.map((b, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {b}
                  </span>
                ))}
              </p>
              <div className="fade-in mt-3.5 flex flex-wrap gap-1.5" style={{ animationDuration: "0.7s", animationDelay: "0.15s" }}>
                {coach.disciplineSlugs.map((s, i) => {
                  const name = getDisciplineBySlug(s)?.name ?? s;
                  return (
                    <Link
                      key={s}
                      href={`/disciplines/${s}`}
                      className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] font-medium wide:px-[13px] wide:py-[7px] ${i === 0 ? "border-accent text-accent" : "border-border bg-surface text-fg"}`}
                    >
                      {name}
                    </Link>
                  );
                })}
              </div>
              <FavouriteButton coachId={coach.id} coachSlug={coach.slug} className="mt-5 hidden wide:flex" />
            </div>
          </div>

          <div className="px-[18px] wide:px-0">
            <p className="fade-in mt-[26px] font-display text-[24px] leading-[1.25] text-ink wide:mt-11 wide:max-w-[26ch] wide:text-[32px] wide:leading-[1.2]" style={{ animationDuration: "0.7s", animationDelay: "0.2s" }}>
              {coach.headline}
            </p>
            <p className="mt-3.5 text-[16px] leading-[1.55] text-muted wide:mt-[18px] wide:max-w-[64ch] wide:text-[17px]">{coach.bio}</p>

            {coach.videoUrl && (
              <video src={coach.videoUrl} controls className="mt-6 w-full max-w-lg rounded-[16px]" />
            )}

            {/* ── skills / setup / qualifications ──────────────────── */}
            <div className="wide:mt-12 wide:grid wide:grid-cols-2 wide:gap-10">
              <div>
                {coach.skillNames.length > 0 && (
                  <section>
                    <h2 className="mt-9 text-[30px] leading-none text-ink wide:mt-0 wide:text-[32px]">What {firstName} helps with</h2>
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {coach.skillNames.map((s) => (
                        <span key={s} className="rounded-[var(--radius-pill)] border border-border bg-surface px-[13px] py-2 text-[14px] text-fg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {coach.qualifications.length > 0 && (
                  <section className="hidden wide:block">
                    <h2 className="mt-8 text-[32px] leading-none text-ink">Qualifications</h2>
                    <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
                      {coach.qualifications.map((q) => (
                        <li key={q} className="flex gap-2.5">
                          <span aria-hidden className="text-accent">—</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              <div>
                {setupTiles.length > 0 && (
                  <section>
                    <h2 className="mt-8 text-[30px] leading-none text-ink wide:mt-0 wide:text-[32px]">Setup</h2>
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                      {setupTiles.map((t) => (
                        <div key={t.k} className="rounded-[12px] bg-shade p-3.5 text-[14px] leading-[1.35] text-fg">
                          <span className="mb-1 block font-display text-[18px] italic text-accent">{t.k}</span>
                          {t.v}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
            {coach.qualifications.length > 0 && (
              <section className="wide:hidden">
                <h2 className="mt-8 text-[30px] leading-none text-ink">Qualifications</h2>
                <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
                  {coach.qualifications.map((q) => (
                    <li key={q} className="flex gap-2.5">
                      <span aria-hidden className="text-accent">—</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ── testimonials ───────────────────────────────────────── */}
          {coach.testimonials.length > 0 && (
            <section className="mt-9 bg-ink pt-10 text-ink-fg wide:mt-14 wide:rounded-[22px] wide:p-9">
              <div className="px-[18px] wide:px-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-fg/60">From {firstName}&rsquo;s riders</p>
                <h2 className="mt-2.5 text-[34px] leading-none wide:text-[40px]">
                  What riders <em className="text-peach">say</em>
                </h2>
              </div>
              <div className="hs mt-[22px] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] pb-9 wide:mt-6 wide:grid wide:grid-cols-3 wide:gap-3.5 wide:overflow-visible wide:px-0 wide:pb-0">
                {coach.testimonials.map((t) => (
                  <figure key={t.quote} className="flex w-[300px] shrink-0 snap-start flex-col gap-3.5 rounded-[18px] bg-ink-card p-[22px] wide:w-auto wide:rounded-[16px]">
                    <span aria-hidden className="font-display text-[44px] leading-[0.5] text-peach">&ldquo;</span>
                    <blockquote className="font-display text-[20px] leading-[1.3] wide:text-[19px]">{t.quote}</blockquote>
                    <figcaption className="mt-auto text-[13px] text-ink-fg/65">{t.author}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* ── next clinic + get in touch (phones) — 120px bottom room for
                 the sticky enquiry bar ───────────────────────────────── */}
          <div className="px-[18px] pb-[120px] pt-9 wide:px-0 wide:pb-0">
            {nextClinic && clinicDate && (
              <section>
                <h2 className="text-[30px] leading-none text-ink wide:mt-12 wide:text-[32px]">Upcoming clinic</h2>
                <Link
                  href={nextClinic.id ? `/clinics/${nextClinic.id}` : "#"}
                  className="mt-3.5 grid grid-cols-[64px_1fr] gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 text-inherit transition-colors duration-300 hover:border-accent wide:grid-cols-[72px_1fr_auto] wide:items-center wide:gap-[18px] wide:py-3.5 wide:pl-3.5 wide:pr-[18px]"
                >
                  <span className="rounded-[10px] bg-shade py-2 text-center wide:py-2.5">
                    <span className="block font-display text-[26px] leading-none text-ink wide:text-[28px]">{clinicDate.getDate()}</span>
                    <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">{MONTHS[clinicDate.getMonth()]}</span>
                  </span>
                  <span>
                    <span className="block font-display text-[20px] leading-[1.1] text-ink wide:text-[22px]">{nextClinic.title}</span>
                    <span className="mt-[5px] block text-[13px] text-subtle wide:text-[14px]">
                      {nextClinic.location}
                      {nextClinic.placesLeft != null && ` · ${nextClinic.placesLeft} place${nextClinic.placesLeft === 1 ? "" : "s"} left`}
                    </span>
                  </span>
                  <span className="hidden text-[14px] font-medium text-accent wide:inline">Details →</span>
                </Link>
              </section>
            )}

            <section className="wide:hidden">
              <h2 className="mt-9 text-[30px] leading-none text-ink">Get in touch</h2>
              <p className="mt-2 text-[15px] leading-[1.5] text-muted">
                {firstName} usually replies within a day. You deal with {firstName} direct — ECA never takes a cut.
              </p>
              {coach.contactId && (
                <PhoneReveal contactId={coach.contactId} hasPhone={coach.contact.hasPhone} className="mt-3.5 w-full py-3.5" />
              )}
              <ContactLinks email={coach.contact.email} facebookUrl={coach.contact.facebookUrl} className="mt-3.5" />
              {!canEnquire && !coach.contact.hasPhone && !coach.contact.email && !coach.contact.facebookUrl && (
                <p className="mt-2 text-[14px] text-subtle">This coach hasn&apos;t published contact details yet.</p>
              )}
            </section>
          </div>
        </div>

        {/* ── desktop aside ──────────────────────────────────────────── */}
        <aside className="fade-in hidden wide:sticky wide:top-24 wide:block wide:rounded-[22px] wide:border wide:border-border wide:bg-surface wide:p-[26px] wide:shadow-[0_30px_70px_rgba(31,58,46,.1)]" style={{ animationDuration: "0.8s", animationDelay: "0.2s" }}>
          <h2 className="text-[30px] leading-none text-ink">Message {firstName}</h2>
          <p className="mt-2 text-[14px] leading-[1.5] text-subtle">
            Usually replies within a day. Free, no account needed — you deal with {firstName} direct.
          </p>
          <div className="mt-[18px]">
            {enquiryId ? (
              <ContactForm coachId={enquiryId} coachName={coach.name} firstName={firstName} />
            ) : (
              <p className="rounded-[12px] bg-shade p-4 text-[14px] text-subtle">
                {coach.takingStudents === "no" ? `${firstName} isn't taking new students right now.` : "This coach isn't taking enquiries through the site right now."}
              </p>
            )}
          </div>
          {(coach.contact.hasPhone || coach.contact.email || coach.contact.facebookUrl) && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-[14px] text-subtle">Prefer to call?</span>
              {coach.contactId && <PhoneReveal contactId={coach.contactId} hasPhone={coach.contact.hasPhone} className="px-3.5 py-[9px] text-[14px]" />}
              {!coach.contact.hasPhone && <ContactLinks email={coach.contact.email} facebookUrl={coach.contact.facebookUrl} />}
            </div>
          )}
        </aside>
      </div>

      <EnquirySheet coachId={enquiryId} coachName={coach.name} firstName={firstName} takingStudents={coach.takingStudents} />
    </div>
  );
}

function ContactLinks({ email, facebookUrl, className = "" }: { email: string | null; facebookUrl: string | null; className?: string }) {
  if (!email && !facebookUrl) return null;
  return (
    <p className={`flex flex-wrap gap-4 text-[14px] font-medium ${className}`}>
      {email && (
        <a href={`mailto:${email}`} className="border-b border-current text-accent">
          Email {email}
        </a>
      )}
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="border-b border-current text-accent">
          Facebook
        </a>
      )}
    </p>
  );
}
