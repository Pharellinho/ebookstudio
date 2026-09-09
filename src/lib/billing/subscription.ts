import "server-only";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlanId, type PlanId } from "@/lib/billing/plans";
import { getStripe, planOfSubscription } from "@/lib/billing/stripe";

/**
 * What the app knows about an account's subscription. Written from Stripe
 * only (the webhook, or the checkout return page), never from the client.
 */
export type Billing = {
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  /** ISO date the current period ends: the renewal, or the end of access. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export const FREE_BILLING: Billing = {
  plan: "free",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const BILLING_COLUMNS =
  "plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end";

/* Statuses that keep the doors open. `past_due` stays paid while Stripe
   retries the card; the account page says the payment failed. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function admin(): Admin {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

let warnedMissingColumns = false;

function rowToBilling(row: Record<string, unknown> | null): Billing {
  if (!row) return FREE_BILLING;
  return {
    plan: isPlanId(row.plan) ? row.plan : "free",
    stripeCustomerId: typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null,
    stripeSubscriptionId: typeof row.stripe_subscription_id === "string" ? row.stripe_subscription_id : null,
    subscriptionStatus: typeof row.subscription_status === "string" ? row.subscription_status : null,
    currentPeriodEnd: typeof row.current_period_end === "string" ? row.current_period_end : null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
  };
}

/**
 * The billing state of a profile. Before migration 0014 is applied the
 * columns do not exist; that reads as the free plan, with one warning in
 * the log, rather than breaking every signed-in page.
 */
export async function loadBilling(userId: string): Promise<Billing> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return FREE_BILLING;
  const { data, error } = await supabase.from("profiles").select(BILLING_COLUMNS).eq("id", userId).maybeSingle();
  if (error) {
    if (!warnedMissingColumns) {
      warnedMissingColumns = true;
      console.error("loadBilling failed (migration 0014 applied?)", error.message);
    }
    return FREE_BILLING;
  }
  return rowToBilling(data as Record<string, unknown> | null);
}

/** The Stripe customer of a profile, created on first need and remembered. */
export async function ensureStripeCustomer(profile: {
  id: string;
  email: string;
  displayName: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (profile.stripeCustomerId) return profile.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: profile.email,
      name: profile.displayName ?? undefined,
      metadata: { clerk_user_id: profile.id },
    },
    { idempotencyKey: `customer-${profile.id}` },
  );
  const { error } = await admin()
    .from("profiles")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) throw new Error(error.message);
  return customer.id;
}

function customerIdOf(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
}

async function profileIdFor(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMeta = subscription.metadata?.clerk_user_id;
  if (fromMeta) return fromMeta;
  const { data } = await admin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerIdOf(subscription))
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Writes a subscription's current state onto its profile. Called with the
 * subscription as Stripe holds it now, so events arriving out of order do
 * no harm: the latest write always reflects the latest truth.
 */
export async function syncSubscription(subscription: Stripe.Subscription, knownUserId?: string): Promise<void> {
  const userId = knownUserId ?? (await profileIdFor(subscription));
  if (!userId) {
    console.error("syncSubscription: no profile for customer", customerIdOf(subscription));
    return;
  }

  const current = await loadBilling(userId);
  const paid = ACTIVE_STATUSES.has(subscription.status);
  /* An old subscription ending must not wipe a newer one that replaced it. */
  if (!paid && current.stripeSubscriptionId && current.stripeSubscriptionId !== subscription.id) return;

  const plan = paid ? (planOfSubscription(subscription) ?? "studio") : "free";
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const { error } = await admin()
    .from("profiles")
    .update({
      plan,
      stripe_customer_id: customerIdOf(subscription),
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * The checkout return: the browser is back before the webhook, so the
 * session's subscription is read from Stripe and applied right away. Only
 * the account that started the session may claim it.
 */
export async function syncCheckoutSession(sessionId: string, userId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  const owner = session.client_reference_id ?? session.metadata?.clerk_user_id ?? null;
  if (owner !== userId) return false;
  const subscription = session.subscription;
  if (!subscription || typeof subscription === "string") return false;
  await syncSubscription(subscription, userId);
  return true;
}
