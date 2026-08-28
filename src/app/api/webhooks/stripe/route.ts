import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Uses the service-role key, not the request-scoped anon client — Stripe's
// server calls this with no user session, and coach_profiles' RLS only
// lets a coach write their own row, not have Stripe write it for them.
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TIER_BY_PRICE_ENV: Record<string, "standard" | "standard_plus_clinics"> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD ?? ""]: "standard",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINICS ?? ""]: "standard_plus_clinics",
};

function statusFromStripe(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "inactive" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "inactive";
}

async function syncSubscription(supabase: ReturnType<typeof serviceClient>, subscription: Stripe.Subscription) {
  const coachId = subscription.metadata?.coach_id;
  if (!coachId) return; // not one of ours

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? TIER_BY_PRICE_ENV[priceId] : undefined;
  const status = statusFromStripe(subscription.status);

  await supabase
    .from("coach_profiles")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_tier: tier ?? null,
      subscription_status: status,
      published: status === "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", coachId);
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
      const coachId = subscription.metadata?.coach_id;
      if (coachId) {
        await supabase
          .from("coach_profiles")
          .update({ subscription_status: "canceled", published: false })
          .eq("id", coachId);
      }
      break;
    }
    default:
      break; // ignore anything we don't care about
  }

  return NextResponse.json({ received: true });
}
