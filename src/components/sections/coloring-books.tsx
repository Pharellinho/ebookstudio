import { Check, Palette } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const points = [
  "One art style held consistent across every page",
  "Print-ready line art at Amazon KDP dimensions",
  "Matching cover generated with the interior",
  "Themed page sets: animals, mandalas, holidays, kids",
];

export function ColoringBooks() {
  return (
    <section id="coloring-books" className="py-20 lg:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent-strong">
            <Palette className="size-4" aria-hidden="true" />
            Coloring book studio
          </p>
          <h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
            The other book that sells on KDP
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Coloring books are the easiest print-on-demand product to publish
            and the hardest to keep visually consistent. The studio locks a
            style and holds it for the whole book.
          </p>

          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>

          <ButtonLink href="/#founding-offer" size="lg" className="mt-8">
            Join the waitlist
          </ButtonLink>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2">
          {["Woodland animals", "Mandalas", "Ocean life", "Cozy kitchens"].map(
            (theme, index) => (
              <div
                key={theme}
                className="aspect-3/4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1"
                style={{ rotate: index % 2 === 0 ? "-1.5deg" : "1.5deg" }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/25 text-center">
                  <Palette
                    className="size-7 text-primary/50"
                    aria-hidden="true"
                  />
                  <p className="px-3 font-display text-sm font-semibold text-muted-foreground">
                    {theme}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
