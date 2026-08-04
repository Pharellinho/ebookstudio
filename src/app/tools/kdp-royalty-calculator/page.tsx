import type { Metadata } from "next";
import { RoyaltyCalculator } from "@/components/tools/royalty-calculator";
import { Cta } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Kindle royalty calculator",
  description:
    "Estimate what you keep per Kindle sale on the 70% and 35% royalty plans, including Amazon's delivery cost. Free, no signup.",
  alternates: { canonical: "/tools/kdp-royalty-calculator" },
};

export default function RoyaltyCalculatorPage() {
  return (
    <>
      <section className="border-b border-border bg-surface py-14">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Free tool
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Kindle royalty calculator
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Set your list price and see what actually lands in your account per
            sale.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-16">
        <div className="container-page">
          <RoyaltyCalculator />

          <div className="mx-auto mt-14 max-w-2xl">
            <h2 className="font-display text-2xl font-bold">
              How Kindle royalties work
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Amazon offers two royalty plans. The 70% plan pays more but only
              applies when your list price is between $2.99 and $9.99, and
              Amazon deducts a delivery fee based on your file size. The 35%
              plan works at any price from $0.99 to $200 and has no delivery
              fee.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              For a typical text-only ebook of 1 to 3 MB, the 70% plan wins
              comfortably inside its price window. Below $2.99 the 35% plan is
              your only option, which is why $2.99 is such a common floor for
              indie pricing.
            </p>
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}
