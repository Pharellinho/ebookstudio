"use client";

import { useState } from "react";
import { ArrowRight, Check, CreditCard, Lock, ShieldCheck, Zap } from "lucide-react";
import { pricingTiers, proFeatures } from "@/lib/content";
import { cn } from "@/lib/cn";

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
    icon: Lock,
    title: "Secure payments",
    body: "Every transaction is processed by Stripe with bank-level encryption.",
  },
  {
    icon: ShieldCheck,
    title: "Commercial rights",
    body: "You own what you generate. Sell it on KDP, Etsy or your own site.",
  },
];

export function PricingTable() {
  const [selected, setSelected] = useState(pricingTiers[0].price);
  const tier =
    pricingTiers.find((item) => item.price === selected) ?? pricingTiers[0];

  return (
    <div>
      <div className="mx-auto max-w-lg">
        <div className="relative rounded-3xl border-2 border-primary bg-surface-warm p-8 shadow-xl">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-on-primary">
            Most popular
          </span>

          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              Pro
            </p>
            <p className="mt-3 font-display text-5xl font-extrabold">
              ${tier.price}
              <span className="text-lg font-semibold text-muted-foreground">
                /mo
              </span>
            </p>
            <p className="mt-2 font-semibold">
              {tier.credits} credits every month
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cancel anytime · billed monthly · no lock-in
            </p>
          </div>

          <ul className="mt-7 space-y-3">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <Check
                    className="size-3 text-primary-strong"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-8 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-on-primary shadow-md transition-all duration-200 hover:bg-primary-strong hover:shadow-lg"
          >
            Get Pro — ${tier.price}/mo
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-border bg-background p-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Pro plans
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Pick the monthly credits that fit you. Change it whenever you want.
        </p>

        <div
          role="radiogroup"
          aria-label="Monthly credit plans"
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {pricingTiers.map((item) => {
            const active = item.price === selected;
            return (
              <button
                key={item.price}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(item.price)}
                className={cn(
                  "relative cursor-pointer rounded-2xl border-2 px-4 py-4 text-center transition-all duration-200",
                  active
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-background hover:border-primary/40",
                )}
              >
                {item.popular ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-on-primary">
                    Popular
                  </span>
                ) : null}
                <p className="font-display text-xl font-extrabold">
                  ${item.price}
                  <span className="text-xs font-semibold text-muted-foreground">
                    /mo
                  </span>
                </p>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  {item.credits} credits
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Every plan includes the full Pro feature set. Cancel anytime.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        <span className="font-bold">Quick math:</span> at $14.99 a copy, two
        sales cover the $29 plan. Ten sales leave roughly $120 after the
        subscription.
      </p>
    </div>
  );
}
