import type { Metadata } from "next";
import { PricingTable } from "@/components/sections/pricing-table";
import { Faq } from "@/components/sections/faq";
import { faqs, formats } from "@/lib/content";
import { pricingTiers } from "@/lib/content";
import { pricing, site } from "@/lib/site";

const paidTiers = pricingTiers.filter((tier) => tier.price > 0);
const lowestPaid = Math.min(...paidTiers.map((tier) => tier.price));
const highestPaid = Math.max(...paidTiers.map((tier) => tier.price));

export const metadata: Metadata = {
  title: "Pricing — credits, plans and what a book costs",
  description: `Your first book is free. Paid plans start at $${pricing.monthlyPrice}/mo for ${pricing.monthlyCredits} credits. See what each ebook format costs in credits, what a regeneration costs, and what every plan includes.`,
  alternates: { canonical: "/pricing" },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${site.name} Studio`,
  description:
    "AI ebook studio subscription with monthly credits, unlimited exports and commercial rights.",
  brand: { "@type": "Brand", name: site.name },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: lowestPaid,
    highPrice: highestPaid,
    offerCount: paidTiers.length,
    url: `${site.url}/pricing`,
  },
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Your first book is free. Plans from ${pricing.monthlyPrice}/mo.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Write and read one complete book at no cost. A paid plan unlocks
            exports and selling — including commercial rights and the
            coloring book studio.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            From ${pricing.monthlyPrice}/mo · cancel anytime
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page">
          <PricingTable />
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16 lg:py-20">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What each book costs in credits
          </h2>
          <p className="mt-3 text-muted-foreground">
            A regeneration costs roughly half of a full generation, so
            iterating on a chapter or a cover stays cheap.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full min-w-[38rem] text-left text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Format
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Pages
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Chapters
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Credits
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Regeneration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {formats.map((format) => (
                  <tr key={format.slug}>
                    <th scope="row" className="px-5 py-4 font-semibold">
                      {format.name}
                    </th>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format.pages}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format.chapters}
                    </td>
                    <td className="px-5 py-4 font-semibold text-primary">
                      {format.credits}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format.regenCredits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Faq items={faqs} />
    </>
  );
}
