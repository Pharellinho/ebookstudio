import { Plus } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { faqs, homeFaqs } from "@/lib/content";

type FaqItem = { q: string; a: string };

export function Faq({
  items = homeFaqs,
  title = "Questions? We have answers.",
}: {
  items?: readonly FaqItem[];
  title?: string;
}) {
  return (
    <section id="faq" className="bg-surface-warm py-28 lg:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="p" className="eyebrow-pill">
            FAQ
          </Reveal>
          <Reveal
            as="h2"
            delay={70}
            className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          >
            {title}
          </Reveal>
        </div>

        <div className="mx-auto mt-16 max-w-3xl divide-y divide-border">
          {items.map((faq, index) => (
            <Reveal key={faq.q} delay={Math.min(index, 4) * 70}>
              <details open={index === 0} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-primary-strong transition-transform duration-300 group-open:rotate-45">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function faqStructuredData(items: readonly FaqItem[] = homeFaqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export { faqs };
