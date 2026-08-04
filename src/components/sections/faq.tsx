import { Plus } from "lucide-react";
import { faqs, prelaunchFaqs } from "@/lib/content";

type FaqItem = { q: string; a: string };

export function Faq({
  items = prelaunchFaqs,
  title = "Questions? We have answers.",
}: {
  items?: readonly FaqItem[];
  title?: string;
}) {
  return (
    <section id="faq" className="py-20 lg:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">FAQ</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            {title}
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {items.map((faq, index) => (
            <details
              key={faq.q}
              open={index === 0}
              className="group rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 open:bg-background open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-transform duration-200 group-open:rotate-45">
                  <Plus className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function faqStructuredData(items: readonly FaqItem[] = prelaunchFaqs) {
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
