import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { isPaidPlan, priceKeyFor } from "@/lib/billing/plans";
import { ensurePriceId, getStripe, stripeConfigured } from "@/lib/billing/stripe";
import { ensureStripeCustomer } from "@/lib/billing/subscription";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { plan } → { url }
 *
 * Opens a Stripe Checkout for a plan and hands back where to send the
 * browser. An account that already pays is sent to the billing portal
 * instead, where the plan is changed without a second subscription.
 */
export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const plan = typeof payload === "object" && payload ? (payload as { plan?: unknown }).plan : null;
  if (!isPaidPlan(plan)) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });

  const rate = await checkRateLimit(`billing:checkout:${profile.id}`, { limit: LIMIT, windowMs: WINDOW_MS });
  if (!rate.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const origin = new URL(request.url).origin;
  try {
    const stripe = getStripe();
    const customer = await ensureStripeCustomer({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      stripeCustomerId: profile.billing.stripeCustomerId,
    });

    if (profile.billing.plan !== "free" && profile.billing.stripeSubscriptionId) {
      const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/account` });
      return NextResponse.json({ url: portal.url, portal: true });
    }

    const price = await ensurePriceId(priceKeyFor(plan, profile.isFounder));
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: profile.id,
      metadata: { clerk_user_id: profile.id, plan },
      subscription_data: { metadata: { clerk_user_id: profile.id, plan } },
      success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });
    if (!session.url) throw new Error("checkout session without url");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing checkout failed", error);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
