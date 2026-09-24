import type { SupabaseClient } from "@supabase/supabase-js";
import { FOUNDING_PRICE_ID, getStripe, isMockPayments } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { addMonths, countWord, formatLongDate, getFirstChargeDate, getFoundingFreeMonths, getPlans } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site-url";

/**
 * The founding offer's billing (The Site as a CMS §09):
 *
 *   before launch   the card is saved and nothing else (Stripe Checkout in
 *                   setup mode); the subscription row says card_saved,
 *                   Spotlight, founding.
 *   launch day      locking launch_date turns every saved card into a
 *                   subscription on the founding Listed price with its trial
 *                   ending on the first charge date, and emails the date.
 *   after launch    a founding sign-up gets that subscription and trial
 *                   straight away.
 *   while trialing  they have Spotlight; when the trial ends Stripe charges
 *                   the founding Listed price and the webhook moves them to
 *                   Listed (mock mode: the daily job does).
 *   reminders       30, 14 and 3 days before the first charge.
 *
 * Mock mode writes the same rows with no card, like the rest of billing.
 */

type Service = SupabaseClient;

export async function chargeWording(): Promise<string> {
  const first = await getFirstChargeDate();
  if (first) return `Nothing is charged until ${formatLongDate(first)}.`;
  const months = countWord(await getFoundingFreeMonths());
  return `Nothing is charged until ${months} months after we launch. We'll email you the exact date on launch day.`;
}

async function saveSub(service: Service, providerId: string, fields: Record<string, unknown>) {
  const { error } = await service
    .from("subscriptions")
    .upsert({ provider_id: providerId, ...fields, updated_at: new Date().toISOString() }, { onConflict: "provider_id" });
  if (error) throw error;
}

async function ensureCustomer(service: Service, providerId: string, email: string | undefined): Promise<string> {
  const stripe = getStripe()!;
  const { data: sub } = await service.from("subscriptions").select("stripe_customer_id").eq("provider_id", providerId).maybeSingle();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id as string;
  const customer = await stripe.customers.create({ email, metadata: { provider_id: providerId } });
  await saveSub(service, providerId, { stripe_customer_id: customer.id });
  return customer.id;
}

/**
 * The founding card step. Returns a Stripe Checkout URL to send the member
 * to, or null when it's done already (mock mode).
 */
export async function startFoundingCard(service: Service, providerId: string, email: string | undefined, returnPath: string): Promise<string | null> {
  const first = await getFirstChargeDate();
  if (isMockPayments) {
    await saveSub(service, providerId, {
      tier: "spotlight",
      founding: true,
      status: first ? "trialing" : "card_saved",
      trial_ends_at: first?.toISOString() ?? null,
      stripe_customer_id: `mock_${providerId.slice(0, 8)}`,
    });
    return null;
  }
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't connected yet.");
  const customer = await ensureCustomer(service, providerId, email);
  const back = absoluteUrl(returnPath);
  if (!first) {
    // Before launch: save the card, no subscription yet.
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer,
      currency: "aud",
      success_url: `${back}${back.includes("?") ? "&" : "?"}card=saved`,
      cancel_url: `${back}${back.includes("?") ? "&" : "?"}card=cancelled`,
      metadata: { provider_id: providerId, founding: "true" },
    });
    return session.url;
  }
  if (!FOUNDING_PRICE_ID) throw new Error("No Stripe price set for the founding plan.");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: FOUNDING_PRICE_ID, quantity: 1 }],
    subscription_data: { trial_end: Math.floor(first.getTime() / 1000), metadata: { provider_id: providerId, founding: "true" } },
    success_url: `${back}${back.includes("?") ? "&" : "?"}card=saved`,
    cancel_url: `${back}${back.includes("?") ? "&" : "?"}card=cancelled`,
    metadata: { provider_id: providerId, founding: "true" },
  });
  return session.url;
}

async function memberEmails(service: Service, providerId: string) {
  const { data } = await service.from("provider_members").select("profiles(email, name)").eq("provider_id", providerId);
  return (data ?? [])
    .map((m) => (m as unknown as { profiles: { email: string | null; name: string | null } | null }).profiles)
    .filter((p): p is { email: string; name: string | null } => Boolean(p?.email));
}

/**
 * Launch day: every founding member with a saved card gets their
 * subscription, trialing until the first charge date, and an email with it.
 * Safe to run twice (billing_notices records who has been done).
 */
export async function activateFoundingMembers(service: Service, launchDate: Date): Promise<number> {
  const first = addMonths(launchDate, await getFoundingFreeMonths());
  const { data: subs } = await service
    .from("subscriptions")
    .select("id, provider_id, stripe_customer_id")
    .eq("founding", true)
    .eq("status", "card_saved");
  const stripe = isMockPayments ? null : getStripe();
  const plans = await getPlans();
  let done = 0;
  for (const s of subs ?? []) {
    if (stripe) {
      if (!FOUNDING_PRICE_ID || !s.stripe_customer_id) continue;
      await stripe.subscriptions.create({
        customer: s.stripe_customer_id,
        items: [{ price: FOUNDING_PRICE_ID }],
        trial_end: Math.floor(first.getTime() / 1000),
        metadata: { provider_id: s.provider_id, founding: "true" },
      });
    }
    await service.from("subscriptions").update({ status: "trialing", trial_ends_at: first.toISOString(), updated_at: new Date().toISOString() }).eq("id", s.id);
    const { error } = await service.from("billing_notices").insert({ subscription_id: s.id, kind: "launch_date" });
    if (!error) {
      for (const m of await memberEmails(service, s.provider_id)) {
        await sendEmail({
          to: m.email,
          subject: `We've launched: your first charge is on ${formatLongDate(first)}`,
          text: `Hi ${(m.name ?? "").split(" ")[0] || "there"},\n\nEquine Professionals Australia launched on ${formatLongDate(launchDate)}. As a founding member you're on ${plans.spotlight.name} for free until ${formatLongDate(first)}. From then it's ${plans.listed.name} at ${plans.listed.monthly} a month, and that price stays yours for as long as you stay.\n\nYou can change plan or cancel before then from your dashboard: ${absoluteUrl("/dashboard/billing")}\n\nWe'll remind you 30, 14 and 3 days before.`,
        });
      }
    }
    done++;
  }
  return done;
}

const REMINDER_DAYS = [30, 14, 3];

/**
 * The daily job: reminders before a founding member's first charge, and in
 * mock mode the end of the trial (Stripe does that part for real).
 */
export async function runFoundingJob(service: Service, now = new Date()): Promise<{ reminders: number; converted: number }> {
  const plans = await getPlans();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const { data: subs } = await service
    .from("subscriptions")
    .select("id, provider_id, trial_ends_at")
    .eq("founding", true)
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null);
  let reminders = 0;
  let converted = 0;
  for (const s of subs ?? []) {
    const end = new Date(s.trial_ends_at as string);
    const days = Math.round((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - today.getTime()) / 86_400_000);
    if (isMockPayments && days <= 0) {
      await service.from("subscriptions").update({ status: "active", tier: "listed", updated_at: now.toISOString() }).eq("id", s.id);
      converted++;
      continue;
    }
    if (!REMINDER_DAYS.includes(days)) continue;
    const { error } = await service.from("billing_notices").insert({ subscription_id: s.id, kind: `reminder_${days}` });
    if (error) continue; // already sent
    for (const m of await memberEmails(service, s.provider_id)) {
      await sendEmail({
        to: m.email,
        subject: `Your first charge is in ${days} days`,
        text: `Hi ${(m.name ?? "").split(" ")[0] || "there"},\n\nYour free founding period ends on ${formatLongDate(end)}. From then your plan is ${plans.listed.name} at ${plans.listed.monthly} a month, charged to the card you saved, and that price stays yours for as long as you stay.\n\nTo change plan or cancel before then: ${absoluteUrl("/dashboard/billing")}`,
      });
    }
    reminders++;
  }
  return { reminders, converted };
}
