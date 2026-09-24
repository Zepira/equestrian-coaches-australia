import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
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

const TIER_BY_PRICE_ENV: Record<string, "listed" | "spotlight" | "clinic"> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_LISTED ?? ""]: "listed",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SPOTLIGHT ?? ""]: "spotlight",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINIC ?? ""]: "clinic",
};

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
  const tier = priceId ? TIER_BY_PRICE_ENV[priceId] : undefined;
  const status = statusFromStripe(subscription.status);
  const live = status === "active" || status === "trialing";

  await supabase.from("subscriptions").upsert(
    {
      provider_id: providerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_price_id: priceId ?? null,
      tier: tier ?? null,
      status,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_id" }
  );
  // Until the review queue (CMS build stage 5), a live plan publishes.
  await supabase
    .from("providers")
    .update({ status: live ? "published" : "draft", ...(live ? { published_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
    .eq("id", providerId);
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
      if (session.subscription) {
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
        await supabase.from("providers").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", providerId);
      }
      break;
    }
    default:
      break; // ignore anything we don't care about
  }

  return NextResponse.json({ received: true });
}
