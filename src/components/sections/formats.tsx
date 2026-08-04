import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formats } from "@/lib/content";
import { Section } from "@/components/sections/section";

export function Formats() {
  return (
    <Section
      id="formats"
      eyebrow="Six formats"
      title="Pick the book your audience actually wants"
      description="Every format has its own structure, length and chapter logic. You pick one, the studio adapts the whole pipeline."
      className="border-y border-border bg-surface"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {formats.map((format) => (
          <Link
            key={format.slug}
            href={`/ebook-types/${format.slug}`}
            className="group flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">
                {format.name}
              </h3>
              <ArrowUpRight
                className="size-5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
                aria-hidden="true"
              />
            </div>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {format.summary}
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Pages</dt>
                <dd className="mt-0.5 font-semibold">{format.pages}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Chapters</dt>
                <dd className="mt-0.5 font-semibold">{format.chapters}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Credits</dt>
                <dd className="mt-0.5 font-semibold text-primary">
                  {format.credits}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </Section>
  );
}
