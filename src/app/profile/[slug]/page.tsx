import type { Metadata } from "next";
import { CoachProfile, PLACEHOLDER_COACH_SLUGS, coachMetadata } from "./coach-profile";
import { ProfessionalProfile, isProfessionalSlug, professionalMetadata } from "./professional-profile";

/**
 * /profile/[slug]: every provider's profile, whatever they do (The Site as a
 * CMS §05.3). Two renderers until stage 4 makes one: mock horse care
 * professionals get the professional layout; real providers and the mock
 * coaches get the coach layout (./coach-profile.tsx), which looks up the
 * database first. Old /coaches/<provider> links 301 here from the term page.
 */
export function generateStaticParams() {
  // Sample profiles aren't prerendered: they render on request, so switching
  // samples off (or a profession getting its first real profile) removes
  // them at once.
  return PLACEHOLDER_COACH_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  if ((await searchParams).preview) return { title: "Preview", robots: { index: false, follow: false } };
  return isProfessionalSlug(slug) ? professionalMetadata(slug) : coachMetadata(slug);
}

// ?preview=1: the provider's own look at an unpublished profile (onboarding's
// last step), shown only to its members and admins by RLS.
export default async function ProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const preview = Boolean((await searchParams).preview);
  return isProfessionalSlug(slug) ? <ProfessionalProfile slug={slug} /> : <CoachProfile slug={slug} preview={preview} />;
}
