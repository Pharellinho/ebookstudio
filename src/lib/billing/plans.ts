/**
 * The plans, as the app and Stripe both know them. Safe to import from
 * client components: no secret, no SDK.
 *
 * A Stripe price is found by its `lookup_key`, so the same key names the
 * same price in test mode and in live mode without copying ids around.
 */

export type PlanId = "free" | "studio" | "studio_plus";
export type PaidPlanId = Exclude<PlanId, "free">;

export type PriceKey = "studio_monthly" | "studio_founding_monthly" | "studio_plus_monthly";

export const PLAN_NAMES: Record<PlanId, string> = {
  free: "Free",
  studio: "Studio",
  studio_plus: "Studio Plus",
};

export const PLAN_PRICES: Record<PaidPlanId, number> = {
  studio: 29,
  studio_plus: 49,
};

/** Launch pricing for the first hundred on the waitlist: Studio at $19. */
export const FOUNDING_PRICE = 19;

export const PRICE_KEYS: Record<PaidPlanId, PriceKey> = {
  studio: "studio_monthly",
  studio_plus: "studio_plus_monthly",
};
export const FOUNDING_PRICE_KEY: PriceKey = "studio_founding_monthly";

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === "studio" || value === "studio_plus";
}

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || isPaidPlan(value);
}

/** The price a given account pays for a plan: founders get Studio at the launch price. */
export function priceKeyFor(plan: PaidPlanId, isFounder: boolean): PriceKey {
  if (plan === "studio" && isFounder) return FOUNDING_PRICE_KEY;
  return PRICE_KEYS[plan];
}

export function priceFor(plan: PaidPlanId, isFounder: boolean): number {
  if (plan === "studio" && isFounder) return FOUNDING_PRICE;
  return PLAN_PRICES[plan];
}

export function planFromPriceKey(key: string | null | undefined): PaidPlanId | null {
  switch (key) {
    case "studio_monthly":
    case "studio_founding_monthly":
      return "studio";
    case "studio_plus_monthly":
      return "studio_plus";
    default:
      return null;
  }
}

/* What each plan may do. The free book is written and read in full; the
   files, the coloring studio and further books come with a plan. */
export const FREE_BOOK_LIMIT = 1;

export function planAllowsExport(plan: PlanId): boolean {
  return plan !== "free";
}

export function planAllowsColoring(plan: PlanId): boolean {
  return plan !== "free";
}

export function planAllowsAnotherBook(plan: PlanId, existingBooks: number): boolean {
  return plan !== "free" || existingBooks < FREE_BOOK_LIMIT;
}
