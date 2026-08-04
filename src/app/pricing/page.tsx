import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PricingTable } from "@/components/sections/pricing-table";
import { Faq } from "@/components/sections/faq";
import { faqs, formats } from "@/lib/content";
import { founder, launch, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — credits, plans and what a book costs",
  description:
    "EbookStudio plans start at $29/mo for 300 credits. See what each ebook format costs in credits, what a regeneration costs, and what every plan includes.",
  alternates: { canonical: "/pricing" },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${site.name} Pro`,
  description:
    "AI ebook studio subscription with monthly credits, unlimited exports and commercial rights.",
  brand: { "@type": "Brand", name: site.name },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: 29,
    highPrice: 99,
    offerCount: 6,
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
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Go Pro from $29/mo to publish
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            These are the prices from {launch.label}. A Pro plan is required to
            create, export and sell — including commercial rights and the
            coloring book studio.
          </p>

          <Link
            href="/#founding-offer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary-soft px-5 py-3 text-sm font-bold text-primary-strong transition-colors hover:bg-primary hover:text-on-primary"
          >
            Join before launch and pay ${founder.monthlyPrice}/mo instead
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
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
