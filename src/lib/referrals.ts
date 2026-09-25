import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlans, getReferralCapPerYear, getReferralCouponId, getReferralRewardMonths } from "@/lib/settings";
import { isTier } from "@/lib/tiers";

/**
 * Referrals and promo codes at checkout (The Marketing Engine M6). Stripe
 * stays the authority for what a code does, as it is for prices.
 *
 * - A colleague who joined with a provider's referral code gets their first
 *   month free: the referral_coupon_id Stripe coupon, applied at checkout.
 * - When that colleague's first payment goes through, the referrer gets a
 *   month's credit (their own plan's monthly price, times the reward
 *   months) on their Stripe balance, up to referral_cap_per_year a year.
 * - A promo code carried in by a link (providers.promo_code) is applied at
 *   checkout instead, and counted once the plan is live.
 * In mock payments the same rows move and no money does.
 */
type Service = SupabaseClient;

const cents = (price: string) => Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);

/** What Stripe Checkout should apply for this provider, or null to let them type a code. */
export async function checkoutDiscounts(service: Service, providerId: string): Promise<{ promotion_code?: string; coupon?: string }[] | null> {
  const { data: p } = await service.from("providers").select("promo_code").eq("id", providerId).single();
  if (p?.promo_code) {
    const { data: code } = await service.from("promo_codes").select("stripe_promotion_code_id, active, expires_on").eq("code", p.promo_code).maybeSingle();
    const live = code?.active && (!code.expires_on || new Date(`${code.expires_on}T23:59:59Z`) >= new Date());
    if (live && code?.stripe_promotion_code_id) return [{ promotion_code: code.stripe_promotion_code_id as string }];
  }
  const { data: referral } = await service.from("referrals").select("id").eq("referee_provider_id", providerId).eq("status", "joined").maybeSingle();
  const coupon = await getReferralCouponId();
  if (referral && coupon) {
    await service.from("referrals").update({ referee_coupon: coupon }).eq("id", referral.id);
    return [{ coupon }];
  }
  return null;
}

/** Once a plan is live: count the promo code it carried, once. */
export async function recordPromoUse(service: Service, providerId: string) {
  const { data: p } = await service.from("providers").select("promo_code").eq("id", providerId).single();
  if (!p?.promo_code) return;
  const { data: code } = await service.from("promo_codes").select("id").eq("code", p.promo_code).maybeSingle();
  if (code) await service.from("promo_redemptions").upsert({ promo_id: code.id, provider_id: providerId }, { onConflict: "promo_id,provider_id", ignoreDuplicates: true });
}

/**
 * The referee's first payment went through: mark it, and credit the
 * referrer's month (or note they've hit the yearly cap). Safe to call more
 * than once: only a referral still at "joined" moves.
 */
export async function rewardOnFirstPayment(service: Service, refereeProviderId: string, stripe: Stripe | null) {
  const { data: ref } = await service
    .from("referrals")
    .update({ status: "paid" })
    .eq("referee_provider_id", refereeProviderId)
    .eq("status", "joined")
    .select("id, referrer_provider_id")
    .maybeSingle();
  if (!ref) return "none" as const;

  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const [{ count }, cap, months] = await Promise.all([
    service.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_provider_id", ref.referrer_provider_id).eq("status", "rewarded").gte("rewarded_at", yearAgo),
    getReferralCapPerYear(),
    getReferralRewardMonths(),
  ]);
  if ((count ?? 0) >= cap) {
    await service.from("referrals").update({ status: "capped" }).eq("id", ref.id);
    return "capped" as const;
  }

  if (stripe) {
    const { data: sub } = await service.from("subscriptions").select("stripe_customer_id, tier").eq("provider_id", ref.referrer_provider_id).maybeSingle();
    if (!sub?.stripe_customer_id) return "waiting" as const; // they're not paying us yet: nothing to credit against
    const plans = await getPlans();
    const price = plans[isTier(sub.tier) ? sub.tier : "listed"].monthly;
    await stripe.customers.createBalanceTransaction(sub.stripe_customer_id as string, {
      amount: -cents(price) * months,
      currency: "aud",
      description: `Referral: ${months} free month${months === 1 ? "" : "s"}`,
    });
  }
  await service.from("referrals").update({ status: "rewarded", rewarded_at: new Date().toISOString() }).eq("id", ref.id);
  return "rewarded" as const;
}
