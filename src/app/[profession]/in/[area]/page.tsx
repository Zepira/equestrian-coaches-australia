import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfessionalListing } from "@/components/professional-listing";
import { CoachArea, coachAreaMetadata } from "@/components/sections/coach-area";
import { getProfession } from "@/lib/cms/read";
import { getArea, getSectionTerms, isAreaPageEligible, requireSection } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site-url";
import { areaPagePath, sectionPath } from "@/lib/page-paths";

/**
 * /[profession]/in/[area]: everyone in a profession near a place. Rendered
 * only once indexable_pages says the place has earned it; below the gate a
 * horse care page goes to its section with the place filled in, and the
 * coaches page to /search (see CoachArea).
 */
type Params = { params: Promise<{ profession: string; area: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { profession: slug, area: areaSlug } = await params;
  const profession = await getProfession(slug);
  if (!profession?.open) return {};
  if (profession.door === "coaches") return coachAreaMetadata(areaSlug);
  const area = await getArea(areaSlug);
  if (!area) return {};
  return {
    title: `${profession.name} in ${area.name}, ${area.state}`,
    description: `${profession.name} covering ${area.name}, ${area.state}. Free for horse owners.`,
    alternates: { canonical: absoluteUrl(areaPagePath({ professionSlug: profession.slug, areaSlug })) },
    openGraph: { images: [{ url: `/api/og/area?p=${profession.slug}&a=${areaSlug}`, width: 1200, height: 630 }] },
  };
}

export default async function ProfessionAreaPage({ params }: Params) {
  const { profession: slug, area: areaSlug } = await params;
  const profession = await requireSection(slug);
  if (profession.door === "coaches") return <CoachArea profession={profession} areaSlug={areaSlug} />;
  const area = await getArea(areaSlug);
  if (!area) redirect(sectionPath(profession.slug));
  if (!(await isAreaPageEligible(profession.id, area.id, null))) {
    redirect(`${sectionPath(profession.slug)}?location=${encodeURIComponent(`${area.name} ${area.state}`)}`);
  }
  return <ProfessionalListing profession={profession} area={area} specialities={await getSectionTerms(profession.id)} />;
}
