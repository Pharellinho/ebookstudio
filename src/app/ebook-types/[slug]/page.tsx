import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { formats } from "@/lib/content";
import { IdeaForm } from "@/components/idea-form";
import { Cta } from "@/components/sections/cta";

export function generateStaticParams() {
  return formats.map((format) => ({ slug: format.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/ebook-types/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const format = formats.find((item) => item.slug === slug);
  if (!format) return {};

  return {
    title: `${format.name} ebooks generated with AI`,
    description: `${format.summary} ${format.pages} pages, ${format.chapters} chapters, ${format.credits} credits. Exported as print-ready PDF, EPUB and DOCX.`,
    alternates: { canonical: `/ebook-types/${format.slug}` },
  };
}

export default async function EbookTypePage({
  params,
}: PageProps<"/ebook-types/[slug]">) {
  const { slug } = await params;
  const format = formats.find((item) => item.slug === slug);
  if (!format) notFound();

  const others = formats.filter((item) => item.slug !== format.slug);

  return (
    <>
      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {format.name}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
              AI-drafted {format.name.toLowerCase()} ebooks
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {format.summary}
            </p>
            <p className="mt-3 text-muted-foreground">
              Built for: {format.audience}
            </p>

            <div className="mt-8">
              <IdeaForm />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 shadow-md">
            <h2 className="font-display text-lg font-semibold">
              What this format produces
            </h2>
            <ul className="mt-5 space-y-3">
              {format.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground">
                    {highlight}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Pages</dt>
                <dd className="mt-1 font-display font-semibold">
                  {format.pages}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Chapters</dt>
                <dd className="mt-1 font-display font-semibold">
                  {format.chapters}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Credits</dt>
                <dd className="mt-1 font-display font-semibold text-primary">
                  {format.credits}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Regeneration</dt>
                <dd className="mt-1 font-display font-semibold">
                  {format.regenCredits}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold">
            Other formats to consider
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/ebook-types/${other.slug}`}
                className="rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <p className="font-display text-sm font-semibold">
                  {other.name}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {other.pages} pages · {other.credits} credits
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}
