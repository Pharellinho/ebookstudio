import type { Metadata } from "next";
import { PageCountConverter } from "@/components/tools/page-count-converter";
import { Cta } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Word count to pages converter",
  description:
    "Convert a manuscript word count into a printed page count for common KDP trim sizes and font sizes. Free, instant, no signup.",
  alternates: { canonical: "/tools/word-count-to-pages" },
};

export default function WordCountPage() {
  return (
    <>
      <section className="border-b border-border bg-surface py-14">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Free tool
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Word count to pages converter
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find out how thick your book will actually be before you format it.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-16">
        <div className="container-page">
          <PageCountConverter />

          <div className="mx-auto mt-14 max-w-2xl">
            <h2 className="font-display text-2xl font-bold">
              Why page count matters on KDP
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Paperback printing cost is driven by page count, which sets the
              minimum price you can list at and therefore your royalty. A book
              that lands just under a printing threshold can be meaningfully
              more profitable than one that tips over it.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Page count also shapes reader expectations. A how-to guide of 30
              to 60 pages reads as practical. The same content stretched to 200
              pages reads as padded.
            </p>
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}
