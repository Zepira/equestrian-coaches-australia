"use server";

import { redirect } from "next/navigation";
import { getStripe, isMockPayments } from "@/lib/stripe";
import { requireProvider } from "@/lib/provider-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isTier, type Tier } from "@/lib/tiers";
import { SITE_URL } from "@/lib/site-url";
import { syncVisibility } from "@/lib/provider-lifecycle";
import { startFoundingCard } from "@/lib/founding";
import { addMonths, getPauseMaxMonths, getStripePrices } from "@/lib/settings";
import { checkoutDiscounts, recordPromoUse, rewardOnFirstPayment } from "@/lib/referrals";

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
      plan_changed_at: new Date().toISOString(),
      canceled_at: null,
      cancel_at: null,
      stripe_customer_id: `mock_${providerId.slice(0, 8)}`,
      stripe_subscription_id: `mock_sub_${Date.now()}`,
    });
    await syncVisibility(service, providerId, true);
    // In mock payments the plan starting stands in for the first payment (M6).
    await recordPromoUse(service, providerId);
    await rewardOnFirstPayment(service, providerId, null);
    redirect(`${done}&mock=1`);
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");

  const priceId = (await getStripePrices())[tier].monthly;
  const discounts = await checkoutDiscounts(service, providerId);
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
    // A referral's free month or a partner's promo code; otherwise they can type one.
    ...(discounts ? { discounts } : { allow_promotion_codes: true }),
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
    // No portal in mock mode; cancelling and pausing happen in-app (cancelSubscription, pauseSubscription).
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
    await saveSubscription(service, providerId, { tier, status: "active", plan_changed_at: new Date().toISOString(), cancel_at: null });
    await syncVisibility(service, providerId, true);
    redirect("/dashboard/billing?changed=1");
  }
  await openBillingPortal();
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

// ── Keeping them (The Marketing Engine stage E) ────────────────────────────
// Cancel is always one click, on the same page as the pause and the move
// down to Listed, never behind them. Stripe's hosted portal has no pause, so
// all four happen here.

async function currentSub(service: NonNullable<ReturnType<typeof createServiceSupabase>>, providerId: string) {
  const { data } = await service.from("subscriptions").select("stripe_subscription_id, tier, status, founding, billing_interval, current_period_end, trial_ends_at").eq("provider_id", providerId).maybeSingle();
  return data;
}

/** No charges and the profile hidden for 1 to pause_max_months months, then back by itself. */
export async function pauseSubscription(fd: FormData) {
  const { service, providerId } = await requireBilling();
  const months = Number(fd.get("months"));
  const max = await getPauseMaxMonths();
  if (!Number.isInteger(months) || months < 1 || months > max) throw new Error(`Pause for 1 to ${max} months.`);
  const sub = await currentSub(service, providerId);
  if (!sub || !["active", "trialing"].includes(sub.status as string)) redirect("/dashboard/billing");
  const until = addMonths(new Date(), months);
  if (!isMockPayments && sub!.stripe_subscription_id) {
    await getStripe()!.subscriptions.update(sub!.stripe_subscription_id as string, { pause_collection: { behavior: "void", resumes_at: Math.floor(until.getTime() / 1000) } });
  }
  await saveSubscription(service, providerId, { status: "paused", paused_until: until.toISOString(), cancel_at: null });
  await syncVisibility(service, providerId, false);
  redirect("/dashboard/billing?paused=1");
}

export async function resumeSubscription() {
  const { service, providerId } = await requireBilling();
  const sub = await currentSub(service, providerId);
  if (sub?.status !== "paused") redirect("/dashboard/billing");
  if (!isMockPayments && sub!.stripe_subscription_id) {
    await getStripe()!.subscriptions.update(sub!.stripe_subscription_id as string, { pause_collection: null } as never);
  }
  const trialing = sub!.founding && sub!.trial_ends_at && new Date(sub!.trial_ends_at as string) > new Date();
  await saveSubscription(service, providerId, { status: trialing ? "trialing" : "active", paused_until: null });
  await syncVisibility(service, providerId, true);
  redirect("/dashboard/billing?resumed=1");
}

/**
 * One click. With Stripe the plan runs to the end of the paid period (or the
 * free period) and the listing stays live until then; in mock payments it
 * ends at once. The reason is optional.
 */
export async function cancelSubscription(fd: FormData) {
  const { service, providerId } = await requireBilling();
  const reason = String(fd.get("reason") ?? "").slice(0, 60) || null;
  const sub = await currentSub(service, providerId);
  if (!sub) redirect("/dashboard/billing");
  if (isMockPayments || !sub!.stripe_subscription_id) {
    const now = new Date().toISOString();
    await saveSubscription(service, providerId, { status: "canceled", canceled_at: now, cancel_at: now, cancel_reason: reason, paused_until: null });
    await syncVisibility(service, providerId, false);
    redirect("/dashboard/billing?cancelled=1");
  }
  const updated = await getStripe()!.subscriptions.update(sub!.stripe_subscription_id as string, { cancel_at_period_end: true, pause_collection: null } as never);
  const end = (updated as unknown as { cancel_at?: number | null }).cancel_at;
  await saveSubscription(service, providerId, { cancel_at: end ? new Date(end * 1000).toISOString() : sub!.current_period_end, cancel_reason: reason });
  redirect("/dashboard/billing?cancelled=1");
}

/** Changed their mind before the plan ran out. */
export async function undoCancel() {
  const { service, providerId } = await requireBilling();
  const sub = await currentSub(service, providerId);
  if (!sub || sub.status === "canceled") redirect("/dashboard/billing");
  if (!isMockPayments && sub!.stripe_subscription_id) await getStripe()!.subscriptions.update(sub!.stripe_subscription_id as string, { cancel_at_period_end: false });
  await saveSubscription(service, providerId, { cancel_at: null, cancel_reason: null });
  redirect("/dashboard/billing?kept=1");
}

/** Monthly to yearly on the same plan: ten months' price. Not for the founding rate, which is monthly by its terms. */
export async function switchToYearly() {
  const { service, providerId } = await requireBilling();
  const sub = await currentSub(service, providerId);
  if (!sub || sub.status !== "active" || sub.billing_interval === "year" || !isTier(sub.tier as string)) redirect("/dashboard/billing");
  if (sub!.founding) throw new Error("The founding rate is monthly.");
  if (!isMockPayments && sub!.stripe_subscription_id) {
    const price = (await getStripePrices())[sub!.tier as Tier].yearly;
    if (!price) throw new Error("No yearly Stripe price is set for this plan yet.");
    const stripe = getStripe()!;
    const s = await stripe.subscriptions.retrieve(sub!.stripe_subscription_id as string);
    await stripe.subscriptions.update(s.id, { items: [{ id: s.items.data[0].id, price }], proration_behavior: "create_prorations" });
  }
  await saveSubscription(service, providerId, { billing_interval: "year", plan_changed_at: new Date().toISOString() });
  redirect("/dashboard/billing?yearly=1");
}
