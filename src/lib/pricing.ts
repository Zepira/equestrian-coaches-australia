// Single source of truth for coach subscription pricing/labels — was
// hardcoded independently in dashboard/billing, dashboard, and for-coaches,
// which could silently drift out of sync with each other.

export type SubscriptionTier = "standard" | "standard_plus_clinics";

export const PRICING_TIERS: Record<SubscriptionTier, { name: string; price: string }> = {
  standard: { name: "Standard", price: "$9.99" },
  standard_plus_clinics: { name: "Standard + Clinics", price: "$14.95" },
};

/** e.g. "Standard — $9.99/mo" */
export function tierLabel(tier: SubscriptionTier): string {
  const { name, price } = PRICING_TIERS[tier];
  return `${name} — ${price}/mo`;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  inactive: "No active subscription",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};
