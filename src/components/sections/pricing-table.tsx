import Link from "next/link";
import { ArrowRight, Check, CreditCard, ShieldCheck, Zap } from "lucide-react";
import { freeFeatures, pricingTiers, proFeatures } from "@/lib/content";
import { pricing } from "@/lib/site";
import { cn } from "@/lib/cn";

/* The free column signs people up for their free book; a paid column goes
   to /upgrade, which asks for a sign-in if needed and then opens the
   Stripe checkout for that plan. */
const SIGNUP_LABEL = "Start free — your first book is on us";
const PLAN_SLUGS: Record<string, string> = { Studio: "studio", "Studio Plus": "studio_plus" };
const FREE_LINE =
  "Your first book is free. You only pay when you're ready to export and sell it.";

/** A sample copy price, used only for the "quick math" paragraph on /pricing. */
const SAMPLE_COPY_PRICE = 14.99;

const trustBadges = [
  {
    icon: Zap,
    title: "Instant access",
    body: "Your credits unlock the moment you subscribe. Start publishing today.",
  },
  {
    icon: CreditCard,
    title: "Cancel anytime",
    body: "No contracts and no lock-in. Downgrade or cancel in one click.",
  },
  {
    icon: ShieldCheck,
    title: "Commercial rights",
    body: "You own what you generate. Sell it on KDP, Etsy or your own site.",
  },
];

/**
 * The three plans, side by side. Shared by /pricing (full version, with the
 * trust badges and the quick math) and the landing page (`compact`, which
 * shows the columns and points to /pricing for the detail).
 */
export function PricingTable({ compact = false }: { compact?: boolean }) {
  const studio =
    pricingTiers.find((tier) => tier.price === pricing.monthlyPrice) ??
    pricingTiers[1];
  const copiesToCover = Math.ceil(studio.price / SAMPLE_COPY_PRICE);
  const leftAfterTen = Math.round(10 * SAMPLE_COPY_PRICE - studio.price);

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-3 md:items-stretch">
        {pricingTiers.map((tier) => {
          const free = tier.price === 0;
          const features = free ? freeFeatures : proFeatures;
          return (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-background p-7",
                tier.popular
                  ? "border-primary shadow-lg"
                  : "border-border shadow-sm",
              )}
            >
              {tier.popular ? (
                <span className="absolute -top-3 left-7 rounded-full bg-primary-soft px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary-strong">
                  Most popular
                </span>
              ) : null}

              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tier.name}
              </p>
              <p className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em]">
                {free ? (
                  "Free"
                ) : (
                  <>
                    ${tier.price}
                    <span className="text-base font-medium text-muted-foreground">
                      /mo
                    </span>
                  </>
                )}
              </p>
              <p className="mt-2 text-sm font-medium">
                {free
                  ? "No card required"
                  : `${tier.credits} credits every month`}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {tier.note}
              </p>

              <ul className="mt-6 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                      <Check
                        className="size-3 text-primary-strong"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={free ? "/signup" : `/upgrade?plan=${PLAN_SLUGS[tier.name] ?? "studio"}`}
                prefetch={free ? undefined : false}
                className={cn(
                  "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-sm font-semibold tracking-tight transition-colors duration-200",
                  tier.popular
                    ? "bg-foreground text-background hover:bg-foreground/85"
                    : "border border-border bg-background text-foreground hover:border-foreground/30 hover:bg-surface-warm",
                )}
              >
                {free ? SIGNUP_LABEL : `Get ${tier.name}`}
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
        {FREE_LINE}
      </p>

      {compact ? (
        <p className="mt-4 text-center text-sm">
          <Link
            href="/pricing"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            See what each book costs in credits →
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {trustBadges.map((badge) => (
              <div
                key={badge.title}
                className="rounded-2xl border border-border bg-surface p-5 text-center"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                  <badge.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-sm font-bold">
                  {badge.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {badge.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl rounded-2xl bg-primary-soft px-6 py-4 text-center text-sm leading-relaxed text-foreground">
            <span className="font-bold">Quick math:</span> at $
            {SAMPLE_COPY_PRICE} a copy, {copiesToCover === 2 ? "two" : copiesToCover}{" "}
            sales cover the {studio.name} plan. Ten sales leave roughly $
            {leftAfterTen} after the subscription.
          </p>
        </>
      )}
    </div>
  );
}
