import "server-only";
import Stripe from "stripe";
import {
  FOUNDING_PRICE,
  PLAN_PRICES,
  planFromPriceKey,
  type PaidPlanId,
  type PriceKey,
} from "@/lib/billing/plans";

/**
 * The Stripe client and the catalogue.
 *
 * Products and prices are created by this code the first time they are
 * needed, with fixed ids and lookup keys, so the Dashboard needs no manual
 * setup and test mode and live mode end up with the same catalogue. A
 * price that already exists is never created twice: it is found by its
 * lookup key first.
 */

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("stripe_not_configured");
  client ??= new Stripe(key, { appInfo: { name: "EbookStudio", url: "https://www.ebookstudioai.com" } });
  return client;
}

type CatalogueEntry = { plan: PaidPlanId; productId: string; productName: string; amountCents: number };

const CATALOGUE: Record<PriceKey, CatalogueEntry> = {
  studio_monthly: {
    plan: "studio",
    productId: "ebookstudio_studio",
    productName: "EbookStudio Studio",
    amountCents: PLAN_PRICES.studio * 100,
  },
  studio_founding_monthly: {
    plan: "studio",
    productId: "ebookstudio_studio",
    productName: "EbookStudio Studio",
    amountCents: FOUNDING_PRICE * 100,
  },
  studio_plus_monthly: {
    plan: "studio_plus",
    productId: "ebookstudio_studio_plus",
    productName: "EbookStudio Studio Plus",
    amountCents: PLAN_PRICES.studio_plus * 100,
  },
};

const priceIds = new Map<PriceKey, string>();

async function ensureProduct(stripe: Stripe, entry: CatalogueEntry): Promise<string> {
  try {
    const product = await stripe.products.retrieve(entry.productId);
    return product.id;
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeError) || error.code !== "resource_missing") throw error;
  }
  const product = await stripe.products.create(
    { id: entry.productId, name: entry.productName, metadata: { plan: entry.plan } },
    { idempotencyKey: `product-${entry.productId}` },
  );
  return product.id;
}

/** The Stripe id of a price, found by lookup key or created once. */
export async function ensurePriceId(key: PriceKey): Promise<string> {
  const cached = priceIds.get(key);
  if (cached) return cached;

  const stripe = getStripe();
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  let id = found.data[0]?.id ?? null;
  if (!id) {
    const entry = CATALOGUE[key];
    const product = await ensureProduct(stripe, entry);
    const price = await stripe.prices.create(
      {
        product,
        currency: "usd",
        unit_amount: entry.amountCents,
        recurring: { interval: "month" },
        lookup_key: key,
        transfer_lookup_key: true,
        metadata: { plan: entry.plan },
      },
      { idempotencyKey: `price-${key}-v1` },
    );
    id = price.id;
  }
  priceIds.set(key, id);
  return id;
}

/** Which plan a subscription buys, read from its first item's price. */
export function planOfSubscription(subscription: Stripe.Subscription): PaidPlanId | null {
  const price = subscription.items.data[0]?.price;
  const fromKey = planFromPriceKey(price?.lookup_key);
  if (fromKey) return fromKey;
  const fromPriceMeta = price?.metadata?.plan;
  if (fromPriceMeta === "studio" || fromPriceMeta === "studio_plus") return fromPriceMeta;
  const fromSubMeta = subscription.metadata?.plan;
  if (fromSubMeta === "studio" || fromSubMeta === "studio_plus") return fromSubMeta;
  return null;
}

export { Stripe };
