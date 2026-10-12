import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getLegalVars, legalMetadata } from "@/lib/legal";
import { isLegalApproved } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("Privacy policy", "What Equine Professionals Australia collects, why, where it's kept and what you can ask us to do with it.");
}

export default async function PrivacyPage() {
  const [doc, approved, vars] = await Promise.all([getContent("legal.privacy"), isLegalApproved(), getLegalVars()]);
  return <LegalPage doc={doc} approved={approved} vars={vars} />;
}
