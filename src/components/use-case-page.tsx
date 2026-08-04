import Link from "next/link";
import { Check } from "lucide-react";
import { IdeaForm } from "@/components/idea-form";
import { Cta } from "@/components/sections/cta";
import { formats } from "@/lib/content";

export type UseCaseContent = {
  eyebrow: string;
  title: string;
  intro: string;
  problems: { title: string; body: string }[];
  outcomes: string[];
  recommendedFormats: string[];
};

export function UseCasePage({ content }: { content: UseCaseContent }) {
  const recommended = formats.filter((format) =>
    content.recommendedFormats.includes(format.slug),
  );

  return (
    <>
      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {content.intro}
          </p>
          <div className="mt-8">
            <IdeaForm />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              What usually goes wrong
            </h2>
            <div className="mt-8 space-y-6">
              {content.problems.map((problem) => (
                <article
                  key={problem.title}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <h3 className="font-display text-base font-semibold">
                    {problem.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {problem.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              What you walk away with
            </h2>
            <ul className="mt-8 space-y-3">
              {content.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{outcome}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 font-display text-lg font-semibold">
              Formats that fit
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {recommended.map((format) => (
                <Link
                  key={format.slug}
                  href={`/ebook-types/${format.slug}`}
                  className="rounded-xl border border-border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <p className="font-display text-sm font-semibold">
                    {format.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format.pages} pages · {format.credits} credits
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}
