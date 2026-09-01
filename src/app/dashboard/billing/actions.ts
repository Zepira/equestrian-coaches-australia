"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isMockPayments, TIER_PRICE_IDS } from "@/lib/stripe";
import { ensureCoachProfile } from "@/lib/supabase/queries";
import { SITE_URL } from "@/lib/site-url";

async function requireCoach() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  // Coaches only get a coach_profiles row lazily (see ensureCoachProfile) —
  // a coach can reach billing before ever visiting /dashboard/profile, so
  // guarantee the row exists here too. Without this, the updates below
  // silently affect zero rows (no error) and "subscribing" does nothing.
  await ensureCoachProfile(supabase, user.id, profile?.name ?? "Coach");

  return { supabase, userId: user.id, email: user.email ?? undefined };
}

// Creates (or reuses) a Stripe customer for this coach, starts a Checkout
// session for the chosen tier, and sends them there. Publishing the
// profile happens in the webhook once payment actually succeeds — never
// here, so a user can't grant themselves a free listing by hitting cancel.
export async function startCheckout(tier: "standard" | "standard_plus_clinics") {
  const { supabase, userId, email } = await requireCoach();

  // No Stripe account exists yet (business/ownership structure still being
  // decided — see CLAUDE.md). Mock mode writes the same DB fields the real
  // webhook would, so every other feature (publish gating, clinics tier
  // gating, search) can be built and tested against a real "subscribed"
  // coach today, and swaps to real billing the moment Stripe keys land.
  if (isMockPayments) {
    await supabase
      .from("coach_profiles")
      .update({
        stripe_customer_id: `mock_${userId.slice(0, 8)}`,
        stripe_subscription_id: `mock_sub_${Date.now()}`,
        subscription_tier: tier,
        subscription_status: "active",
        published: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    redirect("/dashboard?checkout=success&mock=1");
  }

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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${SITE_URL}/dashboard/billing?checkout=cancelled`,
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

  if (isMockPayments) {
    // No portal to send them to — mock cancel happens in-app instead
    // (see mockCancelSubscription below).
    redirect("/dashboard/billing?mock=1");
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!coach?.stripe_customer_id) throw new Error("No Stripe customer on file yet.");

  const session = await stripe.billingPortal.sessions.create({
    customer: coach.stripe_customer_id,
    return_url: `${SITE_URL}/dashboard/billing`,
  });

  redirect(session.url);
}

// Mock-mode-only stand-in for what Stripe's Customer Portal would do —
// lets the cancel path (unpublish, clinics tier gating) be tested before
// there's a real subscription to cancel.
export async function mockCancelSubscription() {
  const { supabase, userId } = await requireCoach();
  if (!isMockPayments) throw new Error("Not in mock mode.");

  await supabase
    .from("coach_profiles")
    .update({ subscription_status: "canceled", published: false })
    .eq("id", userId);

  redirect("/dashboard/billing");
}
