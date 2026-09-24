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

// Stripe Price IDs are stored beside the prices they charge, in the
// stripe_prices setting (Admin → Plans and prices, checked against Stripe on
// save). The NEXT_PUBLIC_STRIPE_PRICE_* env vars are only its defaults.
