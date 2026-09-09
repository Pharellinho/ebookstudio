import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, Stripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/subscription";

/**
 * Stripe calls this, not the browser: no Clerk, no origin check. The
 * signature on the raw body is the only door, and a bad one is a 400.
 *
 * Every event that can change a subscription ends the same way: the
 * subscription is read again from Stripe and written onto the profile, so
 * the order events arrive in does not matter.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripeConfigured() || !secret) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (error) {
    console.error("stripe webhook signature failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(id);
        const owner = session.client_reference_id ?? session.metadata?.clerk_user_id ?? undefined;
        await syncSubscription(subscription, owner);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    /* A 500 makes Stripe retry later, which is what we want when the
       database was the problem. */
    console.error(`stripe webhook ${event.type} failed`, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
