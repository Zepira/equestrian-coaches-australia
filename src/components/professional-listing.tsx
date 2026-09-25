/**
 * A horse care listing page, for every address the profession template
 * gives a horse care profession: the section (/farriers), a speciality
 * (/farriers/remedial-shoeing), a place page (/farriers/in/ballarat-vic, and
 * with a speciality) and every profession near a place (/horse-care/search).
 * Laid out like a coach discipline page (src/components/sections/
 * coach-discipline.tsx): breadcrumb, copy + photo, the search card pre-set,
 * then the cards, then the specialities and the other professions.
 *
 * The listings are mock data (src/lib/mock-professionals.ts) until the
 * schema carries a profession. A typed place resolves against the real
 * postcode table; with a point the list is nearest first and limited to
 * whoever is within 100 km or whose own travel radius reaches it.
 */
import Link from "next/link";
import { CoachCard } from "@/components/coach-card";
import { HorseCareSearch } from "@/components/horse-care-search";
import { JsonLd } from "@/components/json-ld";
import { ProfessionGlyph, hasGlyph } from "@/components/profession-glyph";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";
import { resolveSearchLocation, searchProviders } from "@/lib/supabase/queries";
import { pickFeatured } from "@/lib/featured";
import { FeaturedBlock } from "@/components/featured-block";
import type { CoachCardData } from "@/components/coach-card";
import { titleCase } from "@/lib/text";
import { breadcrumbSchema, itemListSchema } from "@/lib/structured-data";
import { horseCareOf, sectionHref, type Profession } from "@/lib/professions";
import { getProfessions } from "@/lib/cms/read";
import { areaPagePath, profilePath, termPath } from "@/lib/page-paths";
import type { SectionTerm } from "@/lib/sections";
import { professionPhoto, searchMockProfessionals } from "@/lib/mock-professionals";
import { logImpressions } from "@/lib/coach-events";
import { termImagePublicUrl } from "@/lib/discipline-content";
import { RichText } from "@/components/rich-text";
import { getAreaIntro } from "@/lib/cms/read";
import { getSamples } from "@/lib/samples";

const RADIUS_KM = 100;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function place(text: string) {
  const q = text.trim();
  if (!q) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  return resolveSearchLocation(supabase, q);
}

export async function ProfessionalListing({
  profession,
  location = "",
  speciality,
  specialities = [],
  area,
}: {
  profession?: Profession;
  location?: string;
  /** Set on /farriers/[speciality] and its place pages. */
  speciality?: SectionTerm;
  /** The profession's specialities, linked under the cards. */
  specialities?: SectionTerm[];
  /** Set on a place page (/farriers/in/[area]); the place is fixed, not typed. */
  area?: { id?: string; slug: string; name: string; state: string };
}) {
  const where = await place(area ? `${area.name} ${area.state}` : location);
  // A hand-written intro on the profession's own page about a place (not its speciality pages).
  const intro = area?.id && !speciality ? await getAreaIntro(area.id, profession?.id ?? null) : [];
  const horseCare = horseCareOf(await getProfessions());
  const point = where?.kind === "point" ? { lat: where.lat, long: where.long } : null;
  const filters = {
    lat: point?.lat ?? null,
    long: point?.long ?? null,
    state: where?.kind === "state" ? where.state.code : null,
    radiusKm: RADIUS_KM,
  };

  // Real providers of this profession (or every horse care profession on
  // /horse-care/search), through the same nearby_providers() as /search.
  // A place page never lists remote providers.
  const supabase = await createClient();
  const professionIds = (profession ? [profession] : horseCare).map((p) => p.id).filter((id): id is string => Boolean(id));
  const real = supabase
    ? await searchProviders(supabase, professionIds, { ...filters, disciplineIds: speciality ? [speciality.id] : undefined, includeRemote: !area })
    : [];
  const singularById = new Map(horseCare.map((p) => [p.id, p.singular]));
  const featured = await pickFeatured(supabase, real, { point: Boolean(point) });
  await logImpressions(real.map((r) => ({ id: r.id, professionId: r.professionId })));

  // Mock data merge — see src/lib/mock-professionals.ts to remove; each profession drops its samples once it has a real profile.
  const samples = await getSamples();
  const cards: CoachCardData[] = [
    ...real.map((r) => ({
      ...r,
      disciplineNames: [capitalise(singularById.get(r.professionId ?? null) ?? ""), ...r.disciplineNames.slice(0, 2)].filter(Boolean),
    })),
    ...searchMockProfessionals({ ...filters, professionSlug: profession?.slug, speciality: speciality?.name ?? null }).filter((m) => samples.show(m.professionSlug ?? "")),
  ].sort((a, b) => (point ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : a.name.localeCompare(b.name)));
  const noun = profession ? profession.name.toLowerCase() : "professionals";
  const placeName = where?.kind === "point" ? `${titleCase(where.suburb)} ${where.state}` : where?.kind === "state" ? where.state.name : null;
  const others = horseCare.filter((p) => p.slug !== profession?.slug);
  const photo = profession ? (termImagePublicUrl(profession.imagePath) ?? professionPhoto(profession.slug, 1200)) : professionPhoto("farriers", 1200, 1);
  const sectionSelf = profession ? sectionHref(profession) : "/horse-care/search";
  const termSelf = profession && speciality ? termPath(profession.slug, speciality.slug) : sectionSelf;
  // "Clear place" goes to the page without the place: the speciality page if there is one.
  const self = termSelf;
  const pageUrl = profession && area ? areaPagePath({ professionSlug: profession.slug, termSlug: speciality?.slug, areaSlug: area.slug }) : termSelf;

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Horse care", url: "/horse-care" },
            { name: profession ? profession.name : "Search", url: sectionSelf },
            ...(speciality ? [{ name: speciality.name, url: termSelf }] : []),
            ...(area ? [{ name: area.name, url: pageUrl }] : []),
          ]),
          ...(cards.length > 0 ? [itemListSchema(cards.map((c) => ({ name: c.name, url: c.href ?? profilePath(c.slug) })))] : []),
        ]}
      />

      {/* ── Header: copy left, photograph right ──────────────────────── */}
      <section className="mx-auto max-w-[1184px] px-[18px] pt-8 wide:px-12 wide:pt-16">
        <nav aria-label="Breadcrumb" className="fade-in text-[13px] text-subtle">
          <Link href="/horse-care" className="hover:text-ink">
            Horse care
          </Link>
          <span className="mx-2">/</span>
          {speciality && profession ? (
            <>
              <Link href={sectionSelf} className="hover:text-ink">
                {profession.name}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-fg">{speciality.name}</span>
            </>
          ) : (
            <span className="text-fg">{profession ? profession.name : "Search"}</span>
          )}
        </nav>
        <div className="mt-5 wide:grid wide:grid-cols-[1.15fr_1fr] wide:items-center wide:gap-14">
          <div>
            {profession && hasGlyph(profession.glyphKey) && (
              <ProfessionGlyph slug={profession.glyphKey} size={40} className="fade-in mb-4 text-accent" />
            )}
            <h1
              className="fade-in text-[48px] leading-[0.96] -tracking-[0.02em] text-ink wide:text-[84px] wide:leading-[0.92] wide:-tracking-[0.03em]"
              style={{ animationDelay: "0.1s" }}
            >
              {profession && speciality ? (
                <>
                  {profession.name} for <em className="text-accent">{speciality.name.toLowerCase()}</em>
                </>
              ) : profession && profession.heroHeadline && !area ? (
                <RichText text={profession.heroHeadline} emClassName="text-accent" />
              ) : profession ? (
                <em className="text-accent">{profession.name}</em>
              ) : (
                placeName ? (
                  <>
                    Horse care <em className="text-accent">near you</em>
                  </>
                ) : (
                  <>
                    All horse <em className="text-accent">care</em>
                  </>
                )
              )}
            </h1>
            <p
              className="fade-in mt-5 max-w-[46ch] text-[18px] leading-[1.45] text-ink wide:mt-7 wide:text-[22px] wide:leading-[1.35]"
              style={{ animationDelay: "0.3s" }}
            >
              {profession ? (!speciality && !area && profession.heroLead) || profession.blurb : "Farriers, vets, dentists, bodyworkers and the rest, in one list."}
            </p>
            <p className="fade-in mt-4 text-[14px] text-subtle wide:text-[15px]" style={{ animationDelay: "0.45s" }}>
              {cards.length} {cards.length === 1 && profession ? profession.singular : noun}{" "}
              {placeName ? (where?.kind === "state" ? `in ${placeName}` : `covering ${placeName}`) : "listed across Australia"}
            </p>
            {intro.length > 0 && (
              <div className="mt-5 flex max-w-[60ch] flex-col gap-3 text-[16px] leading-[1.55] text-muted" data-area-intro>
                {intro.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            )}
          </div>
          <figure className="fade-in mt-8 wide:mt-0" style={{ animationDelay: "0.25s" }}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-shade wide:aspect-[5/4] wide:rounded-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
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
          </figure>
        </div>

        <div className="fade-in mt-8 wide:mt-12" style={{ animationDelay: "0.6s" }}>
          <HorseCareSearch professions={horseCare.map(({ slug, name, open }) => ({ slug, name, open }))} tone="plain" defaultProfession={profession?.slug ?? ""} defaultTerm={speciality?.slug ?? ""} defaultLocation={area ? `${area.name} ${area.state}` : location} />
        </div>
      </section>

      {/* ── The professionals ────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] pt-14 wide:px-12 wide:pt-20">
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-8 wide:pt-10">
          <h2 className="text-[30px] leading-[1.02] -tracking-[0.02em] text-ink wide:text-[40px]">
            {cards.length > 0 ? (
              placeName ? (
                <>
                  Near <em className="text-accent">{placeName}</em>
                </>
              ) : (
                <>
                  Every <em className="text-accent">{profession ? profession.singular : "professional"}</em> listed
                </>
              )
            ) : (
              <>Nobody covering {placeName} yet</>
            )}
          </h2>
          {placeName && (
            <Link href={self} className="whitespace-nowrap border-b border-current text-[15px] font-medium text-accent">
              Clear place
            </Link>
          )}
        </div>
        <FeaturedBlock providers={featured} searchTown={placeName} className="mt-8 max-w-[720px]" />
        {cards.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 min-[560px]:grid-cols-2 wide:mt-10 wide:grid-cols-4">
            {cards.map((c) => (
              <CoachCard key={c.slug} coach={c} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[16px] bg-shade px-6 py-8 wide:px-9 wide:py-10">
            <p className="max-w-[54ch] text-[16px] leading-[1.55] text-muted">
              No {noun} within {RADIUS_KM} km of {placeName} have listed, and none travel that far. Try the nearest
              big town, or{" "}
              <Link href={self} className="border-b border-current text-accent hover:text-accent-hover">
                see everyone listed
              </Link>
              .
            </p>
          </div>
        )}
      </Reveal>

      {/* ── Specialities, then the other professions ─────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1184px] px-[18px] py-14 wide:px-12 wide:py-20">
        {profession && specialities.length > 0 && (
          <div className="mb-10 border-t border-border pt-8 wide:pt-10">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">
              {speciality ? `Other ${profession.termNounPlural}` : `By ${profession.termNoun}`}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {specialities
                .filter((t) => t.slug !== speciality?.slug)
                .map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={termPath(profession.slug, t.slug)}
                      className="inline-block rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[14px] font-medium text-fg transition-colors duration-200 hover:border-ink hover:bg-shade"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}
        <div className="border-t border-border pt-8 wide:pt-10">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-accent wide:tracking-[0.2em]">
            {profession ? "Other horse care" : "By profession"}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((p) => (
              <li key={p.slug}>
                <Link
                  href={sectionHref(p) + (location.trim() ? `?location=${encodeURIComponent(location.trim())}` : "")}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-surface px-3.5 py-2 text-[14px] font-medium text-fg transition-colors duration-200 hover:border-ink hover:bg-shade"
                >
                  {hasGlyph(p.glyphKey) && <ProfessionGlyph slug={p.glyphKey} size={16} className="text-accent" />}
                  {p.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/horse-care"
                className="inline-block rounded-[var(--radius-pill)] px-3.5 py-2 text-[14px] font-medium text-accent underline-offset-4 hover:underline"
              >
                All horse care →
              </Link>
            </li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
