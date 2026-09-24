import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionalListing } from "@/components/professional-listing";
import { horseCareOf } from "@/lib/professions";
import { getProfession, getProfessions } from "@/lib/cms/read";

/**
 * A horse care profession's section: /farriers, /vets, /dentists and the
 * rest (route decision, 23 Sep 2026: each open profession is a top-level
 * section, never under /coaches or /horse-care). The live professions are
 * built ahead; one admin adds later renders on its first request, which is
 * why dynamicParams stays on. Any other top-level word 404s from the lookup.
 * Static routes (/about, /search, /coaches…) always win over this segment,
 * and the database refuses a profession slug that would clash with one.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  return horseCareOf(await getProfessions()).filter((p) => p.open).map((p) => ({ profession: p.slug }));
}

/** A horse care profession with a public section, or undefined. */
async function sectionProfession(slug: string) {
  const p = await getProfession(slug);
  return p && p.door === "horse_care" && p.open ? p : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ profession: string }> }): Promise<Metadata> {
  const { profession: slug } = await params;
  const profession = await sectionProfession(slug);
  if (!profession) return {};
  return {
    title: `${profession.name} near you`,
    description: `${profession.blurb} Search ${profession.name.toLowerCase()} across Australia by where your horse lives. Free for horse owners.`,
    alternates: { canonical: `/${profession.slug}` },
  };
}

export default async function ProfessionSection({
  params,
  searchParams,
}: {
  params: Promise<{ profession: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { profession: slug } = await params;
  const profession = await sectionProfession(slug);
  if (!profession) notFound();
  const { location = "" } = await searchParams;
  return <ProfessionalListing profession={profession} location={location} />;
}
