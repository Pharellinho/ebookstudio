import Image from "next/image";
import { Check, Loader } from "lucide-react";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-border bg-surface-warm py-20 lg:py-24"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">How it works</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            Three steps from your idea to a published ebook
          </h2>
        </div>

        <ol className="mt-16 grid gap-8 lg:grid-cols-3">
          <Step
            index="Step one"
            title="Describe the book"
            body="Tell the studio what the book is about and who it is for. You get a title and an outline you can edit before a chapter is written."
            mockup={<BriefMockup />}
          />
          <Step
            index="Step two"
            title="Watch it form, then edit"
            body="Chapters and the cover build in front of you. Open any page, change what you want, and regenerate until it feels right."
            mockup={<WritingMockup />}
          />
          <Step
            index="Step three"
            title="Export and sell"
            body="Download a store-ready PDF, EPUB or DOCX, then list it on Amazon KDP, Etsy or your own site. Commercial rights included."
            mockup={<PublishMockup />}
          />
        </ol>
      </div>
    </section>
  );
}

function Step({
  index,
  title,
  body,
  mockup,
}: {
  index: string;
  title: string;
  body: string;
  mockup: React.ReactNode;
}) {
  return (
    <li className="text-center">
      <p className="font-display text-sm font-extrabold uppercase tracking-[0.14em]">
        {index}
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background p-4 shadow-md transition-shadow duration-200 hover:shadow-lg">
        <div className="h-44 overflow-hidden rounded-xl bg-surface p-4 text-left">
          {mockup}
        </div>
      </div>
      <h3 className="mt-6 font-display text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </li>
  );
}

function BriefMockup() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Your idea
      </p>
      <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2.5">
        <p className="text-xs text-foreground">
          A balcony gardening guide for city apartments
          <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-primary" />
        </p>
      </div>
      <p className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Suggested outline
      </p>
      <div className="mt-2 space-y-1.5">
        {[
          "What a balcony can grow",
          "Reading the light you have",
          "Watering in a heatwave",
        ].map((line) => (
          <div
            key={line}
            className="truncate rounded-md bg-background px-2.5 py-1.5 text-[0.65rem] text-muted-foreground"
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function WritingMockup() {
  return (
    <div className="flex h-full gap-3">
      <div className="flex-1 space-y-2">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Writing
        </p>
        {[
          { label: "1. What a balcony can grow", done: true },
          { label: "2. Reading the light", done: true },
          { label: "3. Pots and drainage", done: false },
          { label: "4. Watering in a heatwave", done: false },
        ].map((chapter) => (
          <div key={chapter.label} className="flex items-center gap-1.5">
            {chapter.done ? (
              <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary">
                <Check className="size-2 text-on-primary" aria-hidden="true" />
              </span>
            ) : (
              <Loader
                className="size-3.5 shrink-0 animate-spin text-primary/60"
                aria-hidden="true"
              />
            )}
            <span className="truncate text-[0.65rem] text-muted-foreground">
              {chapter.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative aspect-2/3 w-[4.5rem] shrink-0 self-center overflow-hidden rounded-md border border-border shadow-md">
        <Image
          src="/samples/cover-balcony-garden.webp"
          alt="Cover of The Balcony Garden Year"
          fill
          sizes="72px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function PublishMockup() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
        <span className="text-[0.65rem] font-semibold">Published to KDP</span>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-primary-strong">
          Live
        </span>
      </div>
      <div className="space-y-1.5">
        {["Store-ready PDF", "EPUB for Kindle", "DOCX for editing"].map(
          (file) => (
            <div
              key={file}
              className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5"
            >
              <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-[0.65rem] text-muted-foreground">
                {file}
              </span>
            </div>
          ),
        )}
      </div>
      <p className="text-[0.6rem] text-muted-foreground">
        Commercial licence included
      </p>
    </div>
  );
}
