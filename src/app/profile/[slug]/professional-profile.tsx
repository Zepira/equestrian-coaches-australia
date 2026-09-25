/**
 * A horse care professional's profile, one of the two renderers behind
 * /profile/[slug] (page.tsx picks). Laid out like the coach profile
 * (./coach-profile.tsx) and sharing its CSS (`.coach-profile`), its enquiry
 * form and its phone reveal, in the steel accent: PageContext tells the
 * header which door this page belongs to.
 *
 * Mock data only for now (src/lib/mock-professionals.ts). The enquiry form
 * and phone reveal run against the "mock:<slug>" sentinel, which logs
 * instead of sending, the same as a mock coach.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackToResults } from "@/components/back-to-results";
import { PageContext } from "@/components/page-context";
import { ContactForm } from "@/components/contact-form";
import { EnquirySheet } from "@/components/enquiry-sheet";
import { JsonLd } from "@/components/json-ld";
import { PhoneReveal } from "@/components/phone-reveal";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { breadcrumbSchema, providerSchemas } from "@/lib/structured-data";
import { horseCareResultsPattern, sectionHref } from "@/lib/professions";
import { fillVariables, getContent, getProfession, getProfessions } from "@/lib/cms/read";
import { getMockProfessionalBySlug } from "@/lib/mock-professionals";
import { profilePath, termPath } from "@/lib/page-paths";
import { getSectionTerms } from "@/lib/sections";
import { getSamples } from "@/lib/samples";

export function isProfessionalSlug(slug: string) {
  return Boolean(getMockProfessionalBySlug(slug));
}

export async function professionalMetadata(slug: string): Promise<Metadata> {
  const pro = getMockProfessionalBySlug(slug);
  if (!pro || !(await getSamples()).show(pro.professionSlug)) return { title: "Profile not found" };
  const profession = await getProfession(pro.professionSlug);
  return {
    title: `${pro.name}, ${profession?.singular ?? "horse care"} in ${pro.suburb}`,
    description: `${pro.headline} ${pro.suburb} ${pro.state}.`,
    alternates: { canonical: profilePath(pro.slug) },
    // A sample, for looking around before launch: never for search engines.
    robots: { index: false, follow: false },
  };
}

export async function ProfessionalProfile({ slug }: { slug: string }) {
  const pro = getMockProfessionalBySlug(slug);
  if (!pro || !(await getSamples()).show(pro.professionSlug)) notFound();
  const professions = await getProfessions();
  const profession = professions.find((x) => x.slug === pro.professionSlug);
  if (!profession) notFound();

  const firstName = pro.name.split(" ")[0];
  const mention = await getContent("mention");
  const [nameFirst, ...nameRest] = pro.name.split(" ");
  const contactId = `mock:${pro.slug}`;
  const singular = profession.singular.charAt(0).toUpperCase() + profession.singular.slice(1);
  // A speciality this profession also has a page for links to it.
  const termSlugs = new Map((await getSectionTerms(profession.id)).map((t) => [t.name.toLowerCase(), t.slug]));
  const specialityHref = (name: string) => {
    const slug = termSlugs.get(name.toLowerCase());
    return slug ? termPath(profession.slug, slug) : null;
  };
  const status = pro.taking === "yes" ? "Taking new clients" : "Books full, taking names";

  return (
    <div className="coach-profile">
      <PageContext door="horse-care" resultsHref="/horse-care/search" resultsFrom={horseCareResultsPattern(professions)} />
      <JsonLd
        data={[
          ...providerSchemas({
            name: pro.name,
            slug: pro.slug,
            headline: pro.headline,
            bio: pro.bio,
            suburb: pro.suburb,
            state: pro.state,
            lat: pro.lat,
            long: pro.long,
            photoUrl: pro.photoUrl,
            disciplineNames: pro.specialities,
            jobTitle: profession.jobTitle,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Horse care", url: "/horse-care" },
            { name: profession.name, url: sectionHref(profession) },
            { name: pro.name, url: profilePath(pro.slug) },
          ]),
        ]}
      />

      {/* phone-only top bar over the photo (the desktop header has its own back link) */}
      <div className="absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between bg-[linear-gradient(180deg,rgba(13,24,18,.6),rgba(13,24,18,0))] px-[18px] pt-[var(--safe-top)] text-ink-fg wide:hidden">
        <BackToResults fallback="/horse-care/search" from={horseCareResultsPattern(professions)} className="flex items-center gap-2 text-[14px] font-medium text-ink-fg [&>span]:flex [&>span]:h-9 [&>span]:w-9 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-[999px] [&>span]:bg-ink-deep/55 [&>span]:backdrop-blur-[6px]" />
      </div>

      <div className="mx-auto wide:grid wide:max-w-[1184px] wide:grid-cols-[1fr_400px] wide:items-start wide:gap-14 wide:px-12 wide:pb-20 wide:pt-9">
        <div className="wide:min-w-0">
          {/* ── photo + name block ──────────────────────────────────── */}
          <div className="wide:grid wide:grid-cols-[300px_1fr] wide:items-end wide:gap-9">
            <div
              className="coach-photo fade-in relative h-[440px] overflow-hidden bg-ink-deep wide:aspect-[4/5] wide:h-auto wide:rounded-t-[150px] wide:rounded-b-[16px] wide:bg-shade"
              style={{ animationDuration: "0.7s" }}
            >
              <span data-parallax="drift" data-parallax-speed="0.1" data-parallax-max="50" className="parallax-drift absolute inset-0 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pro.photoUrl} alt="" className="coach-photo__img block h-full w-full object-cover object-[50%_40%]" />
              </span>
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,24,18,.15),rgba(13,24,18,0)_35%,rgba(246,241,231,0)_70%,#f6f1e7_100%)] wide:hidden"
              />
            </div>
            <div className="relative -mt-14 px-[18px] wide:mt-0 wide:px-0 wide:pb-2">
              <span className="fade-in inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-3 py-[7px] text-[12px] font-medium text-ink-fg">
                <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${pro.taking === "yes" ? "bg-success" : "bg-peach"}`} />
                {status}
              </span>
              <h1
                className="fade-in mt-3.5 text-[46px] leading-[0.98] -tracking-[0.025em] text-ink wide:mt-4 wide:text-[68px] wide:leading-[0.95] wide:-tracking-[0.03em]"
                style={{ animationDuration: "0.7s", animationDelay: "0.05s" }}
              >
                <span className="wide:hidden">{pro.name}</span>
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
                Based in <strong className="font-medium text-fg">{pro.suburb} {pro.state}</strong> · travels up to {pro.travelRadiusKm} km ·{" "}
                {pro.yearsPractising} years
              </p>
              <div className="fade-in mt-3.5 flex flex-wrap gap-1.5" style={{ animationDuration: "0.7s", animationDelay: "0.15s" }}>
                <Link
                  href={sectionHref(profession)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-accent px-3 py-1.5 text-[13px] font-medium text-accent wide:px-[13px] wide:py-[7px]"
                >
                  {hasGlyph(profession.glyphKey) && <ProfessionGlyph slug={profession.glyphKey} size={15} />}
                  {singular}
                </Link>
                {pro.specialities.map((s) => (
                  <SpecialityChip key={s} name={s} href={specialityHref(s)} className="rounded-[var(--radius-pill)] border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-fg wide:px-[13px] wide:py-[7px]" />
                ))}
              </div>
            </div>
          </div>

          <div className="px-[18px] wide:px-0">
            <p
              className="fade-in mt-[26px] font-display text-[24px] leading-[1.25] text-ink wide:mt-11 wide:max-w-[26ch] wide:text-[32px] wide:leading-[1.2]"
              style={{ animationDuration: "0.7s", animationDelay: "0.2s" }}
            >
              {pro.headline}
            </p>
            <p className="mt-3.5 text-[16px] leading-[1.55] text-muted wide:mt-[18px] wide:max-w-[64ch] wide:text-[17px]">{pro.bio}</p>

            <div className="wide:mt-12 wide:grid wide:grid-cols-2 wide:gap-10">
              <section>
                <h2 className="mt-9 text-[30px] leading-none text-ink wide:mt-0 wide:text-[32px]">What {firstName} does</h2>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {pro.specialities.map((s) => (
                    <SpecialityChip key={s} name={s} href={specialityHref(s)} className="rounded-[var(--radius-pill)] border border-border bg-surface px-[13px] py-2 text-[14px] text-fg" />
                  ))}
                </div>
              </section>
              <section>
                <h2 className="mt-8 text-[30px] leading-none text-ink wide:mt-0 wide:text-[32px]">Qualifications</h2>
                <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
                  {pro.qualifications.map((q) => (
                    <li key={q} className="flex gap-2.5">
                      <span aria-hidden className="text-accent">·</span>
                      {q}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] text-subtle">Supplied by {firstName}. We don&apos;t check qualifications.</p>
              </section>
            </div>
          </div>

          {/* ── get in touch (phones); bottom room for the sticky enquiry bar ── */}
          <div className="px-[18px] pb-[120px] pt-9 wide:hidden">
            <h2 className="text-[30px] leading-none text-ink">Get in touch</h2>
            <p className="mt-2 text-[15px] leading-[1.5] text-muted">
              You deal with {firstName} directly. We never take a cut of the visit.
            </p>
            {pro.contact.phone && <PhoneReveal contactId={contactId} hasPhone className="mt-3.5 w-full py-3.5" />}
            {pro.contact.email && (
              <p className="mt-3.5 text-[14px] font-medium">
                <a href={`mailto:${pro.contact.email}`} className="border-b border-current text-accent">
                  Email {pro.contact.email}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* ── desktop aside ──────────────────────────────────────────── */}
        <aside
          className="fade-in hidden wide:sticky wide:top-24 wide:block wide:rounded-[22px] wide:border wide:border-border wide:bg-surface wide:p-[26px] wide:shadow-[0_30px_70px_rgba(31,58,46,.1)]"
          style={{ animationDuration: "0.8s", animationDelay: "0.2s" }}
        >
          <h2 className="text-[30px] leading-none text-ink">Message {firstName}</h2>
          <p className="mt-2 text-[14px] leading-[1.5] text-subtle">
            Free, and you don&apos;t need an account. Say what your horse needs and where it&apos;s kept.
          </p>
          <div className="mt-[18px]">
            <ContactForm coachId={contactId} coachName={pro.name} firstName={firstName} kind="professional" />
          </div>
          {(pro.contact.phone || pro.contact.email) && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-[14px] text-subtle">Prefer to call?</span>
              {pro.contact.phone ? (
                <PhoneReveal contactId={contactId} hasPhone className="px-3.5 py-[9px] text-[14px]" />
              ) : (
                <a href={`mailto:${pro.contact.email}`} className="border-b border-current text-[14px] font-medium text-accent">
                  Email instead
                </a>
              )}
            </div>
          )}
          <p data-mention className="mt-4 border-t border-border pt-4 text-[13.5px] leading-[1.5] text-subtle">{fillVariables(mention.prompt, { first_name: firstName })}</p>
        </aside>
      </div>

      <EnquirySheet coachId={contactId} coachName={pro.name} firstName={firstName} takingStudents={pro.taking} kind="professional" />
    </div>
  );
}

function SpecialityChip({ name, href, className }: { name: string; href: string | null; className: string }) {
  return href ? (
    <Link href={href} className={`${className} transition-colors duration-200 hover:border-ink hover:bg-shade`}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  );
}
