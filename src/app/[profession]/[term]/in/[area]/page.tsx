import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfessionalListing } from "@/components/professional-listing";
import { CoachArea, coachAreaMetadata } from "@/components/sections/coach-area";
import { getProfession } from "@/lib/cms/read";
import { getArea, getSectionTerms, isAreaPageEligible, redirectMissingTerm, requireSection } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site-url";
import { areaPagePath, termPath } from "@/lib/page-paths";

/**
 * /[profession]/[term]/in/[area]: one discipline or speciality near a place.
 * Gated like the place page; below the gate it goes to the term's own page,
 * which always exists.
 */
type Params = { params: Promise<{ profession: string; term: string; area: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { profession: slug, term, area: areaSlug } = await params;
  const profession = await getProfession(slug);
  if (!profession?.open) return {};
  if (profession.door === "coaches") return coachAreaMetadata(areaSlug, term);
  const [speciality, area] = await Promise.all([
    getSectionTerms(profession.id).then((ts) => ts.find((t) => t.slug === term)),
    getArea(areaSlug),
  ]);
  if (!speciality || !area) return {};
  return {
    title: `${profession.name} for ${speciality.name.toLowerCase()} in ${area.name}, ${area.state}`,
    description: `${profession.name} covering ${area.name}, ${area.state} who list ${speciality.name.toLowerCase()}.`,
    alternates: { canonical: absoluteUrl(areaPagePath({ professionSlug: profession.slug, termSlug: speciality.slug, areaSlug })) },
    openGraph: { images: [{ url: `/api/og/area?p=${profession.slug}&a=${areaSlug}`, width: 1200, height: 630 }] },
  };
}

export default async function TermAreaPage({ params }: Params) {
  const { profession: slug, term, area: areaSlug } = await params;
  const profession = await requireSection(slug);
  if (profession.door === "coaches") return <CoachArea profession={profession} areaSlug={areaSlug} disciplineSlug={term} />;
  const specialities = await getSectionTerms(profession.id);
  const speciality = specialities.find((t) => t.slug === term);
  if (!speciality) return redirectMissingTerm(profession, term, `/in/${areaSlug}`);
  const area = await getArea(areaSlug);
  if (!area || !(await isAreaPageEligible(profession.id, area.id, speciality.id))) redirect(termPath(profession.slug, speciality.slug));
  return <ProfessionalListing profession={profession} speciality={speciality} specialities={specialities} area={area} />;
}
