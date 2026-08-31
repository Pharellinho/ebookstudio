import type { Metadata } from "next";
import { Formats } from "@/components/sections/formats";
import { Cta } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Ebook types — six AI ebook formats",
  description:
    "Lead magnets, research reports, how-to guides, interactive workbooks, course companions and fiction novels. See length, chapter count and credit cost for each AI ebook format.",
  alternates: { canonical: "/ebook-types" },
};

export default function EbookTypesPage() {
  return (
    <>
      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Ebook types
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Six AI ebook formats, one studio
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            The format changes more than the page count. It changes the outline
            logic, the chapter structure and the way the book is typeset.
          </p>
        </div>
      </section>

      <Formats />
      <Cta />
    </>
  );
}
