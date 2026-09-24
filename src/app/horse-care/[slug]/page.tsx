import { notFound, permanentRedirect } from "next/navigation";
import { sectionHref } from "@/lib/professions";
import { getProfession } from "@/lib/cms/read";

/**
 * The old per-profession pages. Every profession is open now and lives at
 * its own section (/farriers…), so these 301 there. A profession set back
 * to `open: false` would need a real page here again.
 */
export default async function ProfessionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profession = await getProfession(slug);
  // A closed profession's sectionHref points back here: 404 rather than loop.
  if (!profession || profession.door !== "horse_care" || !profession.open) notFound();
  permanentRedirect(sectionHref(profession));
}
