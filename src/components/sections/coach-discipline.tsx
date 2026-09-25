import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { CoachListMap } from "@/components/coach-list-map";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { getAttributes, getDisciplineContent, getSkills, searchCoaches } from "@/lib/supabase/queries";
import { disciplines as staticDisciplines } from "@/lib/disciplines";
import { getCoachesByDiscipline, toCoachCardData } from "@/lib/placeholder-coaches";
import { getMockCoachesByDiscipline } from "@/lib/mock-coaches";
import { descriptionParagraphs, disciplineImage, disciplineSeo } from "@/lib/discipline-content";
import { toTermOption } from "@/lib/term-options";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site-url";
import { disciplinePath, profilePath } from "@/lib/page-paths";
import { redirectMissingTerm } from "@/lib/sections";
import type { Profession } from "@/lib/professions";
import { logImpressions } from "@/lib/coach-events";
import { getSamples } from "@/lib/samples";
import { SubscribeCard } from "@/components/subscribe-card";
import { ReferLink } from "@/components/refer-link";
import { HowWeListLink } from "@/components/how-we-list-link";

/** The seed disciplines, for the term route's generateStaticParams. */
export const SEED_DISCIPLINE_SLUGS = staticDisciplines.map((d) => d.slug);

export async function coachDisciplineMetadata(slug: string): Promise<Metadata> {
  const supabase = await createClient();
  const discipline = (await getDisciplineContent(supabase)).find((d) => d.slug === slug);
  if (!discipline) return { title: "Discipline not found" };
  const seo = disciplineSeo(discipline);
  const image = disciplineImage(discipline, 1200);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: absoluteUrl(disciplinePath(slug)) },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: absoluteUrl(disciplinePath(slug)),
      images: [{ url: image.src, alt: image.alt || `${discipline.name} coaching` }],
    },
  };
}

/**
 * /coaches/[discipline] — one discipline's page, built from its `terms` row:
 * name, blurb, long description, photo and SEO fields are all admin-edited
 * (see /admin/disciplines). Then the search card pre-set to it, and every
 * coach tagged with it.
 */
export async function CoachDiscipline({ profession, slug }: { profession: Profession; slug: string }) {
  const supabase = await createClient();
  const [disciplines, skills, attributes] = await Promise.all([
    getDisciplineContent(supabase),
    getSkills(supabase),
    getAttributes(supabase),
  ]);
  const discipline = disciplines.find((d) => d.slug === slug);
  if (!discipline) return redirectMissingTerm(profession, slug);

  // Mock data merge — see src/lib/mock-coaches.ts to remove.
  const real = supabase ? await searchCoaches(supabase, { disciplineIds: [discipline.id] }) : [];
  await logImpressions(real.map((r) => ({ id: r.id, professionId: r.professionId })));
  const coaches = supabase
    ? [...real, ...((await getSamples()).show("coaches") ? getMockCoachesByDiscipline(slug) : [])]
    : getCoachesByDiscipline(slug).map(toCoachCardData);

  const image = disciplineImage(discipline, 1200);
  const paragraphs = descriptionParagraphs(discipline.description);
  const others = disciplines.filter((d) => d.slug !== slug);
  const termOptions = disciplines.map(toTermOption);
  const lower = discipline.name.toLowerCase();

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Coaches", url: "/coaches" },
            { name: `${discipline.name} coaches`, url: disciplinePath(slug) },
          ]),
          ...(coaches.length > 0 ? [itemListSchema(coaches.map((c) => ({ name: c.name, url: profilePath(c.slug) })))] : []),
        ]}
      />

      {/* ── Header: copy left, photograph right ──────────────────────── */}
      <section className="mx-auto max-w-[1184px] px-[18px] pt-8 wide:px-12 wide:pt-16">
        <nav aria-label="Breadcrumb" className="fade-in text-[13px] text-subtle">
          <Link href="/coaches" className="hover:text-ink">Coaches</Link>
          <span className="mx-2">/</span>
          <span className="text-fg">{discipline.name}</span>
        </nav>
        <div className="mt-5 wide:grid wide:grid-cols-[1.15fr_1fr] wide:items-center wide:gap-14">
          <div>
            <h1 className="fade-in text-[48px] leading-[0.96] -tracking-[0.02em] text-ink wide:text-[84px] wide:leading-[0.92] wide:-tracking-[0.03em]" style={{ animationDelay: "0.1s" }}>
              <em className="text-accent">{discipline.name}</em> coaches
            </h1>
            <p className="fade-in mt-5 max-w-[46ch] text-[18px] leading-[1.45] text-ink wide:mt-7 wide:text-[22px] wide:leading-[1.35]" style={{ animationDelay: "0.3s" }}>
              {discipline.blurb}
            </p>
            <p className="fade-in mt-4 text-[14px] text-subtle wide:text-[15px]" style={{ animationDelay: "0.45s" }}>
              {coaches.length} {lower} coach{coaches.length === 1 ? "" : "es"} listed across Australia
            </p>
          </div>
          <figure className="fade-in mt-8 wide:mt-0" style={{ animationDelay: "0.25s" }}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-shade wide:aspect-[5/4] wide:rounded-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                width={1200}
                height={900}
                fetchPriority="high"
                decoding="async"
                data-parallax="drift"
                data-parallax-speed="0.08"
                data-parallax-max="40"
                className="parallax-drift block h-full w-full object-cover"
              />
            </div>
            {discipline.image_credit ? (
              <figcaption className="mt-2 text-right text-[12px] text-subtle">Photo: {discipline.image_credit}</figcaption>
            ) : null}
          </figure>
        </div>

        <div className="fade-in mt-8 wide:mt-12" style={{ animationDelay: "0.6s" }}>
          <SearchBar defaultDiscipline={slug} tone="plain" skills={skills.map(toTermOption)} attributes={attributes.map(toTermOption)} disciplineOptions={termOptions} />
        </div>
      </section>

      {/* ── About the discipline (only when an admin has written it) ─── */}
      {paragraphs.length > 0 && (
        <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-20">
          <div className="border-t border-border pt-8 wide:grid wide:grid-cols-[1fr_2fr] wide:gap-16 wide:pt-10">
            <h2 className="text-[30px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[40px]">
              About <em className="text-accent">{lower}</em>
            </h2>
            <div className="mt-4 flex max-w-[64ch] flex-col gap-4 text-[16px] leading-[1.6] text-muted wide:mt-0 wide:text-[17px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* ── The coaches ──────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-20">
        <div className="flex items-baseline justify-between border-t border-border pt-8 wide:pt-10">
          <h2 className="text-[30px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[40px]">
            {coaches.length > 0 ? <>The <em className="text-accent">{lower}</em> coaches</> : <>No {lower} coaches yet</>}
          </h2>
          {coaches.length > 0 && (
            <Link href={`/search?d=${slug}`} className="hidden border-b border-current text-[15px] font-medium text-accent wide:inline-block">
              Search by location
            </Link>
          )}
        </div>
        {coaches.length > 0 ? (
          <>
            <CoachListMap coaches={coaches} />
            <HowWeListLink className="mt-4 inline-block" />
          </>
        ) : (
          <div className="mt-6 rounded-[16px] bg-shade px-6 py-8 wide:px-9 wide:py-10">
            <p className="max-w-[54ch] text-[16px] leading-[1.55] text-muted">
              Nobody teaching {lower} has listed yet. That means we haven&rsquo;t reached them, not that they don&rsquo;t exist.
            </p>
          </div>
        )}
        <div className="mt-10 grid gap-4 wide:grid-cols-2">
          <SubscribeCard
            heading={`Hear when a new ${lower} coach starts near you`}
            what={`a new ${lower} coach starts`}
            professionId={profession.id}
            door="coaches"
            termId={discipline.id}
            source={coaches.length === 0 ? "empty-search" : "discipline-page"}
          />
          {coaches.length === 0 && <ReferLink singular={`${lower} coach`} slug="coaches" />}
        </div>
      </Reveal>

      {/* ── Other disciplines ────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] py-14 wide:px-12 wide:py-20">
        <div className="border-t border-border pt-8 wide:pt-10">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">Other disciplines</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((d) => (
              <li key={d.slug}>
                <Link
                  href={disciplinePath(d.slug)}
                  className="inline-block rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[14px] font-medium text-fg transition-colors duration-200 hover:border-ink hover:bg-shade"
                >
                  {d.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/coaches#disciplines" className="inline-block rounded-[var(--radius-pill)] px-3.5 py-2 text-[14px] font-medium text-accent underline-offset-4 hover:underline">
                All disciplines →
              </Link>
            </li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
