import Stripe from "stripe";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

// No Stripe account exists yet (business/ownership structure still being
// decided — see CLAUDE.md). Until STRIPE_SECRET_KEY is set, billing runs
// in mock mode: real DB writes, real UI, no real card ever charged.
// Flip off automatically the moment real keys land in .env.
export const isMockPayments = !isStripeConfigured;

// Returns null until STRIPE_SECRET_KEY is set (see .env.example) — every
// caller must handle that case rather than assume Stripe is live, same
// pattern as src/lib/supabase/client.ts.
export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

import type { Tier } from "@/lib/tiers";

// Stripe Price IDs per plan (monthly). Yearly prices get their own IDs
// once the settings table exists — see CLAUDE.md "Configuration over
// hardcoding" for why display price and price ID must be stored as a pair.
export const TIER_PRICE_IDS: Record<Tier, string | undefined> = {
  listed: process.env.NEXT_PUBLIC_STRIPE_PRICE_LISTED,
  spotlight: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPOTLIGHT,
  clinic: process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINIC,
};
