"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, TIER_PRICE_IDS } from "@/lib/stripe";

async function requireCoach() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  return { supabase, userId: user.id, email: user.email ?? undefined };
}

// Creates (or reuses) a Stripe customer for this coach, starts a Checkout
// session for the chosen tier, and sends them there. Publishing the
// profile happens in the webhook once payment actually succeeds — never
// here, so a user can't grant themselves a free listing by hitting cancel.
export async function startCheckout(tier: "standard" | "standard_plus_clinics") {
  const { supabase, userId, email } = await requireCoach();
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const priceId = TIER_PRICE_IDS[tier];
  if (!priceId) throw new Error(`No Stripe price configured for tier "${tier}".`);

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  let customerId = coach?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { coach_id: userId } });
    customerId = customer.id;
    await supabase.from("coach_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
    metadata: { coach_id: userId, tier },
    subscription_data: { metadata: { coach_id: userId, tier } },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  redirect(session.url);
}

// Sends an already-subscribed coach to Stripe's hosted Customer Portal —
// plan changes, cancellation and payment-method updates are all handled
// there, so none of it needs hand-building.
export async function openBillingPortal() {
  const { supabase, userId } = await requireCoach();
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!coach?.stripe_customer_id) throw new Error("No Stripe customer on file yet.");

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: coach.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  });

  redirect(session.url);
}
