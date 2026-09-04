import Image from "next/image";
import type { CSSProperties } from "react";
import { BookOpen, Check, Download, PenLine, Sparkles } from "lucide-react";
import { Doodle } from "@/components/ui/doodle";
import { Reveal } from "@/components/ui/reveal";

const outlineRows = [
  "What a balcony can grow",
  "Reading the light you have",
  "Watering in a heatwave",
];

const covers = [
  { src: "/samples/cover-rate-card.webp", alt: "The Freelancer Rate Card", tilt: "-7deg" },
  { src: "/samples/cover-balcony-garden.webp", alt: "The Balcony Garden Year", tilt: "0deg" },
  { src: "/samples/cover-focus-workbook.webp", alt: "The Weekly Focus Workbook", tilt: "7deg" },
];

const formatTiles = [
  "Lead magnet",
  "Guide",
  "Report",
  "Workbook",
  "Course",
  "Coloring",
];

const exportFiles = ["Store-ready PDF", "EPUB for Kindle", "DOCX for editing"];

export function Features() {
  return (
    <section id="features" className="bg-surface-warm py-28 lg:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="p" className="eyebrow-pill">
            Features
          </Reveal>
          <Reveal
            as="h2"
            delay={70}
            className="relative mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          >
            Everything you need to publish and get paid
            <Doodle
              kind="sparkle"
              className="absolute -top-7 left-1 size-6 text-primary opacity-90 sm:-left-6 sm:-top-8 sm:size-7"
            />
            <Doodle
              kind="sparkle"
              className="absolute -bottom-5 right-2 size-3.5 text-primary opacity-50 sm:-right-4 sm:bottom-0"
            />
          </Reveal>
          <Reveal
            as="p"
            delay={140}
            className="mt-5 text-lg leading-relaxed text-muted-foreground"
          >
            No writing degree, no design skills, no ghostwriter invoice.
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 lg:mt-20 lg:grid-cols-2">
          <Card
            icon={Sparkles}
            title="From idea to finished book"
            body="Write one sentence about what you know. The studio turns it into a titled, chaptered, fully written ebook."
          >
            <IdeaDemo />
          </Card>

          <Card
            icon={PenLine}
            title="Covers that earn the click"
            body="A professional cover designed for you, the kind that still reads clearly as a thumbnail on a crowded store page."
            delay={70}
          >
            <CoversDemo />
          </Card>

          <Card
            icon={BookOpen}
            title="Ebooks and coloring books"
            body="Lead magnets, guides, reports, workbooks, course companions and novels, plus a studio for print-ready coloring books."
            delay={140}
          >
            <FormatsDemo />
          </Card>

          <Card
            icon={Download}
            title="Store-ready in one click"
            body="Export a clean, typeset PDF or EPUB that is ready for KDP, Etsy or Apple Books the same day."
            delay={210}
          >
            <ExportDemo />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  delay = 0,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="article" delay={delay} className="min-w-0">
      {/* The lift lives on this inner element rather than on Reveal itself:
          Reveal already owns a 700ms entrance transition on this subtree.
          The transition targets `translate`, not `transform` — Tailwind v4
          compiles -translate-y-* to the standalone `translate` property, so a
          transition on `transform` would leave the 3px jump uneased. */}
      <div className="h-full rounded-3xl border border-border bg-background p-7 shadow-sm transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-md lg:p-8">
        <Icon className="size-6 text-primary-strong" aria-hidden="true" />
        <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em]">
          {title}
        </h3>
        <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
          {body}
        </p>

        {/* The panel below is decorative: it re-enacts what the copy just said. */}
        <div
          aria-hidden="true"
          className="mt-7 min-h-[16rem] overflow-hidden rounded-2xl border border-border/60 bg-surface-warm p-6"
        >
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function IdeaDemo() {
  return (
    <div>
      <PanelLabel>Your idea</PanelLabel>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background px-4 py-3">
        <span className="feature-typed text-sm text-foreground">
          How to grow tomatoes on a balcony
        </span>
      </div>

      <div className="mt-6">
        <PanelLabel>Suggested outline</PanelLabel>
      </div>
      <div className="mt-3 space-y-2">
        {outlineRows.map((row, index) => (
          <div
            key={row}
            className="feature-outline-row truncate rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground"
            style={{ animationDelay: `${0.5 + index * 0.3}s` }}
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoversDemo() {
  return (
    <div className="flex h-full min-h-[13rem] items-center justify-center gap-4">
      {covers.map((cover, index) => (
        <div
          key={cover.src}
          className="feature-cover relative aspect-2/3 w-[5.5rem] shrink-0 overflow-hidden rounded-lg shadow-md sm:w-24"
          style={
            { "--tilt": cover.tilt, animationDelay: `${index * 0.8}s` } as CSSProperties
          }
        >
          <Image
            src={cover.src}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function FormatsDemo() {
  return (
    <div>
      <PanelLabel>Pick a format</PanelLabel>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {formatTiles.map((format, index) => (
          <div
            key={format}
            className="feature-tile rounded-xl border border-border px-2 py-4 text-center text-xs text-muted-foreground"
            style={{ animationDelay: `${index * 1.2}s` }}
          >
            {format}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Pick one and we write the whole thing for you.
      </p>
    </div>
  );
}

function ExportDemo() {
  return (
    <div className="flex h-full min-h-[13rem] items-center gap-5">
      <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg shadow-md">
        <Image
          src="/samples/cover-welcome-sequence.webp"
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <PanelLabel>Publish anywhere</PanelLabel>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
          <div className="feature-progress h-full w-full rounded-full bg-primary" />
        </div>

        <div className="mt-4 space-y-2.5">
          {exportFiles.map((file, index) => (
            <div
              key={file}
              className="feature-file flex items-center gap-2.5"
              style={{ animationDelay: `${0.5 + index * 0.2}s` }}
            >
              <Check
                className="feature-tick size-3.5 shrink-0 text-primary-strong"
                style={{ animationDelay: `${0.5 + index * 0.2}s` }}
                aria-hidden="true"
              />
              <span className="truncate text-xs text-muted-foreground">
                {file}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
