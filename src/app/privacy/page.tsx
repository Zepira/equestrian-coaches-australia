import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getContent } from "@/lib/cms/read";
import { getEnquiryRetentionMonths, getFoundingFreeMonths, getFoundingPrice, isLegalApproved } from "@/lib/settings";
import { CONTACT_EMAIL } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const approved = await isLegalApproved();
  return {
    title: "Privacy policy",
    description: "What Equine Professionals Australia collects, why, where it's kept and what you can ask us to do with it.",
    ...(approved ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PrivacyPage() {
  const [doc, approved, founding_price, free_months, enquiryMonths] = await Promise.all([getContent("legal.privacy"), isLegalApproved(), getFoundingPrice(), getFoundingFreeMonths(), getEnquiryRetentionMonths()]);
  return <LegalPage doc={doc} approved={approved} vars={{ founding_price, free_months, contact_email: CONTACT_EMAIL, enquiry_months: String(enquiryMonths) }} />;
}
