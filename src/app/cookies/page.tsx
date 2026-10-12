import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getLegalVars, legalMetadata } from "@/lib/legal";
import { isLegalApproved } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("Cookies", "The cookies and browser storage Equine Professionals Australia uses, which is very little, and none for tracking.");
}

export default async function CookiesPage() {
  const [doc, approved, vars] = await Promise.all([getContent("legal.cookies"), isLegalApproved(), getLegalVars()]);
  return <LegalPage doc={doc} approved={approved} vars={vars} />;
}
