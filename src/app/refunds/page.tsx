import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getLegalVars, legalMetadata } from "@/lib/legal";
import { isLegalApproved } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("Cancelling, changing and refunds", "How billing, cancelling, changing plan, pausing and refunds work for professionals listed on Equine Professionals Australia.");
}

export default async function RefundsPage() {
  const [doc, approved, vars] = await Promise.all([getContent("legal.refunds"), isLegalApproved(), getLegalVars()]);
  return <LegalPage doc={doc} approved={approved} vars={vars} />;
}
