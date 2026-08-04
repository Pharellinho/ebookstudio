import { BookCarousel } from "@/components/book-flip";
import { sampleBooks } from "@/lib/samples";

export function Examples() {
  return (
    <section id="examples" className="border-y border-border bg-surface py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">Turn the pages</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            See exactly what you&apos;ll create
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Four formats: a how-to guide, a workbook, a coloring book and a
            lead magnet. Pick a cover, then drag a page edge to turn it.
          </p>
        </div>

        <div className="mt-10">
          <BookCarousel books={sampleBooks} />
        </div>

        <p className="mx-auto mt-10 max-w-md text-center text-sm text-muted-foreground">
          Sample pages from books built in the studio. Real books run the full
          length, with every page finished and ready to sell.
        </p>
      </div>
    </section>
  );
}
