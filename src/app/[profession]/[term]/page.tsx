import type { Metadata } from "next";
import { ProfessionalListing } from "@/components/professional-listing";
import { CoachDiscipline, SEED_DISCIPLINE_SLUGS, coachDisciplineMetadata } from "@/components/sections/coach-discipline";
import { getProfession } from "@/lib/cms/read";
import { getSectionTerms, redirectMissingTerm, requireSection } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site-url";
import { termPath } from "@/lib/page-paths";

/**
 * /[profession]/[term]: a discipline (/coaches/dressage) or a speciality
 * (/farriers/remedial-shoeing). A word that isn't a term goes through
 * redirectMissingTerm: an old /coaches/<provider> profile link, then a
 * renamed slug, then a 404.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return SEED_DISCIPLINE_SLUGS.map((term) => ({ profession: "coaches", term }));
}

type Params = { params: Promise<{ profession: string; term: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { profession: slug, term } = await params;
  const profession = await getProfession(slug);
  if (!profession?.open) return {};
  if (profession.door === "coaches") return coachDisciplineMetadata(term);
  const speciality = (await getSectionTerms(profession.id)).find((t) => t.slug === term);
  if (!speciality) return {};
  return {
    title: `${profession.name} for ${speciality.name.toLowerCase()}`,
    description: `${profession.name} across Australia who list ${speciality.name.toLowerCase()}. Search by where your horse lives. Free for horse owners.`,
    alternates: { canonical: absoluteUrl(termPath(profession.slug, speciality.slug)) },
  };
}

export default async function TermPage({ params }: Params) {
  const { profession: slug, term } = await params;
  const profession = await requireSection(slug);
  if (profession.door === "coaches") return <CoachDiscipline profession={profession} slug={term} />;
  const specialities = await getSectionTerms(profession.id);
  const speciality = specialities.find((t) => t.slug === term);
  if (!speciality) return redirectMissingTerm(profession, term);
  return <ProfessionalListing profession={profession} speciality={speciality} specialities={specialities} />;
}
