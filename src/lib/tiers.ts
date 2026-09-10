/**
 * The three coach plans (CLAUDE.md "Two-sided marketplace, one-sided
 * pricing", revised 7 Sep 2026). Display prices live here until the
 * `settings` table exists; Stripe price IDs are in src/lib/stripe.ts.
 */
export type Tier = "listed" | "spotlight" | "clinic";
export const TIERS: Tier[] = ["listed", "spotlight", "clinic"];

export const TIER_META: Record<Tier, { name: string; monthly: string; yearly: string; tagline: string }> = {
  listed: { name: "Listed", monthly: "$9.99", yearly: "$99", tagline: "For most coaches" },
  spotlight: { name: "Spotlight", monthly: "$24.95", yearly: "$249", tagline: "For coaches building a book" },
  clinic: { name: "Clinic", monthly: "$49.95", yearly: "$499", tagline: "For coaches who are already full" },
};

export function isTier(v: unknown): v is Tier {
  return v === "listed" || v === "spotlight" || v === "clinic";
}

/** Any active paid plan may list clinics; Listed is capped at one live event. */
export function canListClinics(tier: string | null | undefined, status: string | null | undefined) {
  return status === "active" && isTier(tier);
}
export function clinicLimit(tier: string | null | undefined): number {
  return tier === "listed" ? 1 : Number.POSITIVE_INFINITY;
}
/** Intro video is a Spotlight/Clinic perk. */
export function hasVideo(tier: string | null | undefined, status: string | null | undefined) {
  return status === "active" && (tier === "spotlight" || tier === "clinic");
}
