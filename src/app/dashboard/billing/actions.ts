"use server";

import { redirect } from "next/navigation";
import { getStripe, isMockPayments } from "@/lib/stripe";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isTier, type Tier } from "@/lib/tiers";
import { SITE_URL } from "@/lib/site-url";
import { syncVisibility } from "@/lib/provider-lifecycle";
import { startFoundingCard } from "@/lib/founding";
import { getStripePrices } from "@/lib/settings";

/**
 * Billing writes go to `subscriptions` (one per provider, covering every
 * profession they have) with the service role: members can read their plan
 * but never write it, so nobody can grant themselves a tier.
 *
 * Billing never publishes: review does (src/lib/provider-lifecycle.ts). A
 * plan that lapses hides a reviewed profile, and resuming shows it again.
 */
async function requireBilling() {
  const session = await requireProvider();
  const service = createServiceSupabase();
  if (!service) throw new Error("Billing needs SUPABASE_SERVICE_ROLE_KEY.");
  const {
    data: { user },
  } = await session.supabase.auth.getUser();
  return { ...session, service, email: user?.email ?? undefined };
}

async function saveSubscription(
  service: NonNullable<ReturnType<typeof createServiceSupabase>>,
  providerId: string,
  fields: Record<string, unknown>
) {
  const { error } = await service
    .from("subscriptions")
    .upsert({ provider_id: providerId, ...fields, updated_at: new Date().toISOString() }, { onConflict: "provider_id" });
  if (error) throw error;
}

// Creates (or reuses) a Stripe customer for this provider, starts a Checkout
// session for the chosen tier, and sends them there. Publishing happens in
// the webhook once payment actually succeeds, never here, so a user can't
// grant themselves a free listing by hitting cancel.
export async function startCheckout(tier: Tier) {
  return checkout(tier, "dashboard");
}

/** The plan step of onboarding: same checkout, back to the preview afterwards. */
export async function startCheckoutFromOnboarding(tier: Tier) {
  return checkout(tier, "onboarding");
}

async function checkout(tier: Tier, from: "dashboard" | "onboarding") {
  if (!isTier(tier)) throw new Error("Unknown plan.");
  const done = from === "onboarding" ? "/onboarding?step=preview&checkout=success" : "/dashboard?checkout=success";
  const back = from === "onboarding" ? "/onboarding?step=plan&checkout=cancelled" : "/dashboard/billing?checkout=cancelled";
  const { service, providerId, email } = await requireBilling();

  // No Stripe account yet (see CLAUDE.md, Payments). Mock mode writes the
  // same rows the real webhook would, so everything downstream (publish
  // gating, event tier gating, search) works against a real "subscribed"
  // provider today and swaps to real billing when Stripe keys land.
  if (isMockPayments) {
    await saveSubscription(service, providerId, {
      tier,
      status: "active",
      stripe_customer_id: `mock_${providerId.slice(0, 8)}`,
      stripe_subscription_id: `mock_sub_${Date.now()}`,
    });
    await syncVisibility(service, providerId, true);
    redirect(`${done}&mock=1`);
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const priceId = (await getStripePrices())[tier].monthly;
  if (!priceId) throw new Error(`No Stripe price set for the ${tier} plan. Add it under Admin, Plans and prices.`);

  const { data: sub } = await service.from("subscriptions").select("stripe_customer_id").eq("provider_id", providerId).maybeSingle();
  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { provider_id: providerId } });
    customerId = customer.id;
    await saveSubscription(service, providerId, { stripe_customer_id: customerId });
  }

  const origin = SITE_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${done}`,
    cancel_url: `${origin}${back}`,
    metadata: { provider_id: providerId, tier },
    subscription_data: { metadata: { provider_id: providerId, tier } },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  redirect(session.url);
}

// Sends a subscribed provider to Stripe's hosted Customer Portal: plan
// changes, cancellation and card updates, none of it hand-built.
export async function openBillingPortal() {
  const { service, providerId } = await requireBilling();

  if (isMockPayments) {
    // No portal in mock mode; cancel happens in-app (mockCancelSubscription).
    redirect("/dashboard/billing?mock=1");
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const { data: sub } = await service.from("subscriptions").select("stripe_customer_id").eq("provider_id", providerId).maybeSingle();
  if (!sub?.stripe_customer_id) throw new Error("No Stripe customer on file yet.");

  const origin = SITE_URL;
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id as string,
    return_url: `${origin}/dashboard/billing`,
  });

  redirect(session.url);
}

// Change plan, both directions, any time (a coach goes up to Clinic for
// their clinic month and back down after). Mock mode flips the tier; with
// real Stripe the Customer Portal handles the proration.
export async function changePlan(tier: Tier) {
  if (!isTier(tier)) throw new Error("Unknown plan.");
  const { service, providerId } = await requireBilling();
  if (isMockPayments) {
    await saveSubscription(service, providerId, { tier, status: "active" });
    await syncVisibility(service, providerId, true);
    redirect("/dashboard/billing?changed=1");
  }
  await openBillingPortal();
}

// Mock-mode stand-in for the Customer Portal's cancel, so the cancel path
// (unpublish, event gating) can be tested before there's a real subscription.
export async function mockCancelSubscription() {
  const { service, providerId } = await requireBilling();
  if (!isMockPayments) throw new Error("Not in mock mode.");

  await saveSubscription(service, providerId, { status: "canceled" });
  await syncVisibility(service, providerId, false);

  redirect("/dashboard/billing");
}

// The founding card step (onboarding, or billing for a founding member who
// skipped it). Mock mode saves the row and comes straight back.
export async function saveFoundingCard() {
  return foundingCard("onboarding");
}

export async function saveFoundingCardFromBilling() {
  return foundingCard("dashboard");
}

async function foundingCard(from: "dashboard" | "onboarding") {
  const { service, providerId, email, provider } = await requireBilling();
  if (provider.cohort !== "founding") throw new Error("The founding offer isn't open to this account.");
  const back = from === "onboarding" ? "/onboarding?step=plan" : "/dashboard/billing";
  const url = await startFoundingCard(service, providerId, email, back);
  redirect(url ?? `${back}${back.includes("?") ? "&" : "?"}card=saved`);
}
