import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getFoundingFreeMonths, getFoundingPrice, isLegalApproved } from "@/lib/settings";
import { CONTACT_EMAIL } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const approved = await isLegalApproved();
  return {
    title: "Terms of service",
    description: "The terms for riders, horse owners and the professionals who list on Equine Professionals Australia.",
    // A draft stays out of search results until it's been checked.
    ...(approved ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function TermsPage() {
  const [doc, approved, founding_price, free_months] = await Promise.all([getContent("legal.terms"), isLegalApproved(), getFoundingPrice(), getFoundingFreeMonths()]);
  return <LegalPage doc={doc} approved={approved} vars={{ founding_price, free_months, contact_email: CONTACT_EMAIL }} />;
}
