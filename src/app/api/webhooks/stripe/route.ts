import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { getStripePrices } from "@/lib/settings";
import { TIERS, type Tier } from "@/lib/tiers";
import { syncVisibility } from "@/lib/provider-lifecycle";
import type Stripe from "stripe";

// Uses the service-role key: Stripe calls this with no user session, and
// subscriptions are written only by the service role (members can read
// theirs, never write it).
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Stripe Price ID → plan, from the pairs set under Admin → Plans and prices. The founding price is Listed. */
async function tierByPrice(): Promise<Record<string, Tier>> {
  const prices = await getStripePrices();
  const map: Record<string, Tier> = {};
  for (const t of TIERS) {
    if (prices[t].monthly) map[prices[t].monthly] = t;
    if (prices[t].yearly) map[prices[t].yearly] = t;
  }
  if (prices.founding) map[prices.founding] = "listed";
  return map;
}

/** When the current period ends: on the item in newer Stripe API versions, on the subscription in older ones. */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0] as unknown as { current_period_end?: number } | undefined;
  const ts = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function statusFromStripe(status: Stripe.Subscription.Status): "active" | "trialing" | "past_due" | "canceled" | "inactive" {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "inactive";
}

async function syncSubscription(supabase: ReturnType<typeof serviceClient>, subscription: Stripe.Subscription) {
  const providerId = subscription.metadata?.provider_id;
  if (!providerId) return; // not one of ours

  const priceId = subscription.items.data[0]?.price?.id;
  const status = statusFromStripe(subscription.status);
  const live = status === "active" || status === "trialing";
  // A founding member is on Spotlight while their free period runs, then on
  // the founding Listed price it's billed at (The Site as a CMS §09).
  const founding = subscription.metadata?.founding === "true";
  const tier = founding && status === "trialing" ? "spotlight" : priceId ? (await tierByPrice())[priceId] : undefined;

  await supabase.from("subscriptions").upsert(
    {
      provider_id: providerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_price_id: priceId ?? null,
      // For the yearly renewal reminder (The Marketing Engine §05.9).
      billing_interval: (subscription.items.data[0]?.price?.recurring?.interval as string | undefined) === "year" ? "year" : "month",
      current_period_end: periodEnd(subscription),
      tier: tier ?? null,
      status,
      ...(founding ? { founding: true } : {}),
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_id" }
  );
  // Review publishes; the plan only hides a reviewed profile when it lapses
  // and brings it back when it resumes.
  await syncVisibility(supabase, providerId, live);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe isn't connected yet." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  const supabase = serviceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "setup" && session.metadata?.provider_id && session.setup_intent) {
        // Founding card before launch: make the saved card the customer's
        // default so launch day can start the subscription on it.
        const intent = await stripe.setupIntents.retrieve(session.setup_intent as string);
        const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (customer && intent.payment_method) {
          await stripe.customers.update(customer, { invoice_settings: { default_payment_method: intent.payment_method as string } });
        }
        await supabase.from("subscriptions").upsert(
          { provider_id: session.metadata.provider_id, stripe_customer_id: customer ?? null, tier: "spotlight", status: "card_saved", founding: true, updated_at: new Date().toISOString() },
          { onConflict: "provider_id" }
        );
      } else if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await syncSubscription(supabase, subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      await syncSubscription(supabase, event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const providerId = subscription.metadata?.provider_id;
      if (providerId) {
        await supabase.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("provider_id", providerId);
        await syncVisibility(supabase, providerId, false);
      }
      break;
    }
    default:
      break; // ignore anything we don't care about
  }

  return NextResponse.json({ received: true });
}
