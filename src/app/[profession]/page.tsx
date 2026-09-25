import type { Metadata, Viewport } from "next";
import { CoachesHome } from "@/components/coaches-home";
import { ProfessionalListing } from "@/components/professional-listing";
import { getProfession } from "@/lib/cms/read";
import { getSectionTerms, requireSection } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site-url";
import { sectionPath } from "@/lib/page-paths";

/**
 * /[profession]: every profession's section, from one template (The Site as
 * a CMS §05.3). The coaches door renders its full front door; a horse care
 * profession renders its listing. Rendered per request, not built ahead: it
 * reads the ?location= query and counts impressions, and a profession an
 * admin sets live after a build has to work without one (a prebuilt route
 * tries to render a new slug statically and fails on both). A word that
 * isn't a live profession 404s, static routes always win over this segment,
 * and the database refuses a profession slug that would clash with one.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ profession: string }> };

// The coaches door opens on a dark hero, like "/"; horse care sections on cream.
export async function generateViewport({ params }: Params): Promise<Viewport> {
  const { profession: slug } = await params;
  const dark = (await getProfession(slug))?.door === "coaches";
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: dark ? "#14281f" : "#f6f1e7" };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { profession: slug } = await params;
  const profession = await getProfession(slug);
  if (!profession?.open) return {};
  const canonical = absoluteUrl(sectionPath(profession.slug));
  if (profession.door === "coaches") {
    return {
      title: profession.name,
      description: "Riding coaches across Australia, searchable by discipline and location. Free for riders, always.",
      alternates: { canonical },
    };
  }
  return {
    title: `${profession.name} near you`,
    description: `${profession.blurb} Search ${profession.plural} across Australia by where your horse lives. Free for horse owners.`,
    alternates: { canonical },
  };
}

export default async function ProfessionSection({ params, searchParams }: Params & { searchParams: Promise<{ location?: string }> }) {
  const { profession: slug } = await params;
  const profession = await requireSection(slug);
  if (profession.door === "coaches") return <CoachesHome />;
  const { location = "" } = await searchParams;
  return <ProfessionalListing profession={profession} location={location} specialities={await getSectionTerms(profession.id)} />;
}
