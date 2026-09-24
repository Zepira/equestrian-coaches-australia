import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionalListing } from "@/components/professional-listing";
import { getProfessionBySlug, horseCare } from "@/lib/professions";

/**
 * A horse care profession's section: /farriers, /vets, /dentists and the
 * rest (route decision, 23 Sep 2026: each open profession is a top-level
 * section, never under /coaches or /horse-care). Only the open professions
 * exist; `dynamicParams = false` makes every other top-level word a 404
 * rather than letting this segment swallow it. Static routes (/about,
 * /search, /coaches…) always win over a dynamic segment.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return horseCare.filter((p) => p.open).map((p) => ({ profession: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ profession: string }> }): Promise<Metadata> {
  const { profession: slug } = await params;
  const profession = getProfessionBySlug(slug);
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
  const profession = getProfessionBySlug(slug);
  if (!profession || !profession.open) notFound();
  const { location = "" } = await searchParams;
  return <ProfessionalListing profession={profession} location={location} />;
}
