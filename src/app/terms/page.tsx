import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getLegalVars, legalMetadata } from "@/lib/legal";
import { isLegalApproved } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("Terms of service", "The terms for riders, horse owners and the professionals who list on Equine Professionals Australia.");
}

export default async function TermsPage() {
  const [doc, approved, vars] = await Promise.all([getContent("legal.terms"), isLegalApproved(), getLegalVars()]);
  return <LegalPage doc={doc} approved={approved} vars={vars} />;
}
