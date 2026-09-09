import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getStripe, stripeConfigured } from "@/lib/billing/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * POST → { url }
 *
 * Stripe's own billing portal: invoices, card, plan change, cancellation.
 * Only for an account that has a Stripe customer, so has paid at least once.
 */
export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  const customer = profile.billing.stripeCustomerId;
  if (!customer) return NextResponse.json({ error: "no_customer" }, { status: 409 });

  const rate = await checkRateLimit(`billing:portal:${profile.id}`, { limit: LIMIT, windowMs: WINDOW_MS });
  if (!rate.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${new URL(request.url).origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing portal failed", error);
    return NextResponse.json({ error: "portal_failed" }, { status: 502 });
  }
}
