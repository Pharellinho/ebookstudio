import { BookCarousel } from "@/components/book-flip";
import { Doodle } from "@/components/ui/doodle";
import { Reveal } from "@/components/ui/reveal";
import { sampleBooks } from "@/lib/samples";

export function Examples() {
  return (
    <section id="examples" className="bg-surface-warm py-28 lg:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="p" className="eyebrow-pill">
            Turn the pages
          </Reveal>
          <Reveal
            as="h2"
            delay={70}
            className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          >
            See exactly what you&apos;ll{" "}
            <span className="relative inline-block">
              create
              <Doodle
                kind="underline"
                className="absolute inset-x-0 -bottom-2 h-auto w-full text-primary"
              />
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={140}
            className="mt-5 text-lg leading-relaxed text-muted-foreground"
          >
            Four formats. Pick a cover, then drag a page edge to turn it.
          </Reveal>
        </div>

        <Reveal delay={210} className="mt-16">
          <BookCarousel books={sampleBooks} />
        </Reveal>
      </div>
    </section>
  );
}
