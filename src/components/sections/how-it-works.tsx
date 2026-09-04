"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Loader } from "lucide-react";
import { Doodle } from "@/components/ui/doodle";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    index: "01",
    label: "Step one",
    title: "Describe the book",
    body: "Tell the studio what the book is about and who it is for. You get a title and an outline you can edit before a chapter is written.",
    Mockup: BriefMockup,
  },
  {
    index: "02",
    label: "Step two",
    title: "Watch it form, then edit",
    body: "Chapters and the cover build in front of you. Open any page, change what you want, and regenerate until it feels right.",
    Mockup: WritingMockup,
  },
  {
    index: "03",
    label: "Step three",
    title: "Export and sell",
    body: "Download a store-ready PDF, EPUB or DOCX, then list it on Amazon KDP, Etsy or your own site. Commercial rights included.",
    Mockup: PublishMockup,
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Tracks which step is crossing the middle band of the viewport, so the
  // pinned panel on the left can follow along. Separate from Reveal: this one
  // keeps observing, because the panel has to change back on the way up.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
          if (index !== -1) setActive(index);
        }
      },
      // Only the step passing through the centre of the screen counts.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const node of stepRefs.current) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-28 lg:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="p" className="eyebrow-pill">
            How it works
          </Reveal>
          <Reveal
            as="h2"
            delay={70}
            className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          >
            Three steps. Idea to published.
          </Reveal>
        </div>

        <div className="mt-16 lg:mt-24 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
          {/* Pinned panel — desktop only. Held at full viewport height so the
              visual sits in the vertical centre while the steps scroll past. */}
          <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-border bg-surface-warm p-8">
              {steps.map((step, index) => (
                <div
                  key={step.index}
                  aria-hidden={index !== active}
                  className="absolute inset-0 p-8 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ opacity: index === active ? 1 : 0 }}
                >
                  <step.Mockup />
                </div>
              ))}
            </div>
          </div>

          <ol className="space-y-16 lg:space-y-0">
            {steps.map((step, index) => (
              <li
                key={step.index}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                className="lg:flex lg:min-h-screen lg:flex-col lg:justify-center"
              >
                <Reveal className="relative">
                  {/* Handwritten step label, kept out of the flow so the step
                      itself sits exactly where it did. */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -top-11 left-0 whitespace-nowrap font-hand text-[1.9rem] font-medium leading-none text-primary-strong ${
                      index === 1 ? "rotate-2" : "-rotate-3"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index === 0 ? (
                    <Doodle
                      kind="arrow-down-right"
                      className="absolute -top-9 left-28 hidden h-auto w-11 -rotate-[14deg] text-primary-strong sm:block"
                    />
                  ) : null}
                  {index === 1 ? (
                    <Doodle
                      kind="arrow-up"
                      className="absolute -bottom-10 right-10 hidden h-auto w-10 rotate-[10deg] text-primary-strong sm:block lg:-bottom-12 lg:right-auto lg:left-8"
                    />
                  ) : null}
                  {index === 2 ? (
                    <Doodle
                      kind="arrow-down-right"
                      className="absolute -top-8 left-32 hidden h-auto w-11 rotate-[18deg] text-primary-strong sm:block"
                    />
                  ) : null}
                  <p className="font-display text-sm font-medium tracking-[0.18em] text-primary-strong">
                    {step.index}
                  </p>
                  <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>

                  {/* Mobile keeps each visual with its own step — no pinning. */}
                  <div className="mt-8 aspect-4/3 overflow-hidden rounded-2xl border border-border bg-surface-warm p-6 lg:hidden">
                    <step.Mockup />
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function BriefMockup() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Your idea
      </p>
      <div className="mt-3 rounded-xl bg-background px-4 py-3">
        <p className="text-sm text-foreground">
          A balcony gardening guide for city apartments
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-primary" />
        </p>
      </div>
      <p className="mt-6 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Suggested outline
      </p>
      <div className="mt-3 space-y-2">
        {[
          "What a balcony can grow",
          "Reading the light you have",
          "Watering in a heatwave",
        ].map((line) => (
          <div
            key={line}
            className="truncate rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground"
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
    <div className="flex h-full items-center gap-6">
      <div className="flex-1 space-y-3">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Writing
        </p>
        {[
          { label: "1. What a balcony can grow", done: true },
          { label: "2. Reading the light", done: true },
          { label: "3. Pots and drainage", done: false },
          { label: "4. Watering in a heatwave", done: false },
        ].map((chapter) => (
          <div key={chapter.label} className="flex items-center gap-2">
            {chapter.done ? (
              <Check
                className="size-3.5 shrink-0 text-primary-strong"
                aria-hidden="true"
              />
            ) : (
              <Loader
                className="size-3.5 shrink-0 animate-spin text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
            <span className="truncate text-xs text-muted-foreground">
              {chapter.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-lg shadow-md">
        <Image
          src="/samples/cover-balcony-garden.webp"
          alt="Cover of The Balcony Garden Year"
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function PublishMockup() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Your files
      </p>
      {["Store-ready PDF", "EPUB for Kindle", "DOCX for editing"].map((file) => (
        <div
          key={file}
          className="flex items-center gap-3 rounded-xl bg-background px-4 py-3"
        >
          <Check
            className="size-3.5 shrink-0 text-primary-strong"
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">{file}</span>
        </div>
      ))}
      <p className="mt-2 text-xs text-muted-foreground">
        Commercial licence included
      </p>
    </div>
  );
}
