import Stripe from "stripe";
import { headers } from "next/headers";
import { SITE_STAGE, mockPaymentsAllowed } from "@/lib/launch";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * A live Stripe key on an unlaunched deployment is a real card charge on the
 * test site. Throwing at import time is deliberate: the build or the first
 * request fails loudly, which is recoverable, where a quiet acceptance means
 * finding out from a coach's bank statement.
 *
 * Live keys are allowed from the coaches stage on, because that's when
 * professionals start paying (src/lib/launch.ts). Order: set
 * SITE_STAGE=coaches (or launched) first, then swap in the live keys.
 * docs/launch.md says so too.
 */
if (SITE_STAGE === "soon" && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live")) {
  throw new Error(
    "A live Stripe secret key is set but the site is still at the coming soon stage. Use a test key (sk_test_…), or set SITE_STAGE=coaches first. See docs/launch.md."
  );
}

// No Stripe account exists yet (business/ownership structure still being
// decided — see CLAUDE.md). Until STRIPE_SECRET_KEY is set, billing runs
// in mock mode: real DB writes, real UI, no real card ever charged.
// Flip off automatically the moment real keys land in .env.
export const isMockPayments = !isStripeConfigured;

/**
 * Mock payments give out a real active plan with no card, so a billing
 * action refuses them on the public host: there, no Stripe key means
 * billing isn't set up, not "free plans for everyone". Localhost and the
 * password-protected test hosts keep mock mode. Call at the top of any
 * billing action a person triggers.
 */
export async function refuseMockOnPublicHost() {
  if (!isMockPayments) return;
  if (!mockPaymentsAllowed((await headers()).get("host"))) {
    throw new Error("Billing isn't switched on yet. Please try again soon, or email us.");
  }
}

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
