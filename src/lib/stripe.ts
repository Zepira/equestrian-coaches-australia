import Stripe from "stripe";
import { SITE_LAUNCHED } from "@/lib/launch";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * A live Stripe key on an unlaunched deployment is a real card charge on the
 * test site. Throwing at import time is deliberate: the build or the first
 * request fails loudly, which is recoverable, where a quiet acceptance means
 * finding out from a coach's bank statement.
 *
 * Launch order is therefore: set SITE_LAUNCHED=true, then swap in the live
 * keys. docs/launch.md says so too.
 */
if (!SITE_LAUNCHED && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live")) {
  throw new Error(
    "A live Stripe secret key is set but SITE_LAUNCHED is not true. Use a test key (sk_test_…) until launch, or set SITE_LAUNCHED=true first. See docs/launch.md."
  );
}

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
