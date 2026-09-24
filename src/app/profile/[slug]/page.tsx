import type { Metadata } from "next";
import { mockProfessionals } from "@/lib/mock-professionals";
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
  return [...mockProfessionals.map((p) => ({ slug: p.slug })), ...PLACEHOLDER_COACH_SLUGS.map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return isProfessionalSlug(slug) ? professionalMetadata(slug) : coachMetadata(slug);
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return isProfessionalSlug(slug) ? <ProfessionalProfile slug={slug} /> : <CoachProfile slug={slug} />;
}
