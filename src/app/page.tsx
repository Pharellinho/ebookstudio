import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Examples } from "@/components/sections/examples";
import { Features } from "@/components/sections/features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Platforms } from "@/components/sections/platforms";
import { FounderOffer } from "@/components/sections/founder-offer";
import { Faq, faqStructuredData } from "@/components/sections/faq";
import { Cta } from "@/components/sections/cta";
import { site } from "@/lib/site";

// The spot counter is read at render time, so the page must not stay frozen
// at its build-time value.
export const revalidate = 60;

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
      <FounderOffer />
      <Faq />
      <Cta />
    </>
  );
}
