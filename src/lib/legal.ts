import type { Metadata } from "next";
import type { LegalVars } from "@/components/legal-page";
import { getBusinessAbn, getEnquiryRetentionMonths, getFoundingFreeMonths, getFoundingPrice, getPauseMaxMonths, isLegalApproved } from "@/lib/settings";
import { CONTACT_EMAIL } from "@/lib/site-url";

/** Every variable the legal pages and the review policy can use, from settings. */
export async function getLegalVars(): Promise<LegalVars> {
  const [abn, founding_price, free_months, enquiryMonths, pauseMax] = await Promise.all([
    getBusinessAbn(),
    getFoundingPrice(),
    getFoundingFreeMonths(),
    getEnquiryRetentionMonths(),
    getPauseMaxMonths(),
  ]);
  return {
    contact_email: CONTACT_EMAIL,
    // Unset until the setting is filled in; a bracket is easier to spot than a gap.
    abn: abn || "[ABN: set it on Admin, Settings]",
    founding_price,
    free_months,
    enquiry_months: String(enquiryMonths),
    pause_max_months: String(pauseMax),
  };
}

/**
 * "Equine Professionals Australia, ABN 74 931 177 211, Buln Buln, Victoria":
 * who we are, in the site footer and every marketing email. `place` is the
 * footer content block's; either part is left out while it's blank.
 */
export function businessLine(abn: string, place: string) {
  return ["Equine Professionals Australia", abn && `ABN ${abn}`, place.trim()].filter(Boolean).join(", ");
}

/** A draft stays out of search results until it's been checked. */
export async function legalMetadata(title: string, description: string): Promise<Metadata> {
  const approved = await isLegalApproved();
  return { title, description, ...(approved ? {} : { robots: { index: false, follow: true } }) };
}
