import { notFound, permanentRedirect } from "next/navigation";
import { getProfessionBySlug, sectionHref } from "@/lib/professions";

/**
 * The old per-profession pages. Every profession is open now and lives at
 * its own section (/farriers…), so these 301 there. A profession set back
 * to `open: false` would need a real page here again.
 */
export default async function ProfessionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profession = getProfessionBySlug(slug);
  // A closed profession's sectionHref points back here: 404 rather than loop.
  if (!profession || !profession.open) notFound();
  permanentRedirect(sectionHref(profession));
}
