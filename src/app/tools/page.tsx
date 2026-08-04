import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, FileText } from "lucide-react";
import { Cta } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Free tools for authors",
  description:
    "Free calculators for self-publishers: estimate Amazon KDP royalties per sale and convert a word count into a realistic page count before you publish.",
  alternates: { canonical: "/tools" },
};

export const tools = [
  {
    href: "/tools/kdp-royalty-calculator",
    icon: Calculator,
    title: "Kindle royalty calculator",
    description:
      "See what you actually keep per sale on the 70% and 35% plans, delivery cost included.",
  },
  {
    href: "/tools/word-count-to-pages",
    icon: FileText,
    title: "Word count to pages converter",
    description:
      "Turn a manuscript word count into a page count for your trim size and font size.",
  },
];

export default function ToolsPage() {
  return (
    <>
      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Free tools
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Instant, accurate calculators for KDP
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            No signup, no email. Run the numbers before you price or publish
            your book.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-5 md:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-border bg-surface p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                  <tool.icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mt-5 font-display text-lg font-semibold">
                {tool.title}
              </h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <Cta />
    </>
  );
}
