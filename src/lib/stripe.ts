import Stripe from "stripe";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

// Returns null until STRIPE_SECRET_KEY is set (see .env.example) — every
// caller must handle that case rather than assume Stripe is live, same
// pattern as src/lib/supabase/client.ts.
export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export const TIER_PRICE_IDS: Record<"standard" | "standard_plus_clinics", string | undefined> = {
  standard: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
  standard_plus_clinics: process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINICS,
};
