import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Examples } from "@/components/sections/examples";
import { Features } from "@/components/sections/features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Platforms } from "@/components/sections/platforms";
import { Faq, faqStructuredData } from "@/components/sections/faq";
import { Cta } from "@/components/sections/cta";
import { PricingTable } from "@/components/sections/pricing-table";
import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline} (AI ebook generator)`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData()),
        }}
      />
      <Hero />
      <Examples />
      <HowItWorks />
      <Features />
      <Platforms />
      <Faq />
      <section id="pricing" className="py-28 lg:py-40">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal as="p" className="eyebrow-pill">
              Pricing
            </Reveal>
            <Reveal
              as="h2"
              delay={70}
              className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
            >
              Start free. Pay when you&apos;re ready to sell.
            </Reveal>
          </div>
          <Reveal delay={140} className="mt-16">
            <PricingTable compact />
          </Reveal>
        </div>
      </section>
      <Cta />
    </>
  );
}
