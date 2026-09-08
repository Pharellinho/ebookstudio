"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookText, Check, FileText, Palette } from "lucide-react";
import { BookReader, type ReaderControls } from "@/components/book/book-reader";
import { ThemePicker } from "@/components/app/theme-picker";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";

type Chapter = {
  id: string;
  position: number;
  title: string;
  body: string;
};

/* The formats a finished book can leave in. Export itself is the next
   step of the product; here the reader only picks. */
const EXPORT_FORMATS = [
  {
    id: "pdf",
    name: "PDF",
    blurb: "Exactly the pages you see here. The safest file to sell and to print.",
    recommended: true,
  },
  {
    id: "epub",
    name: "EPUB",
    blurb: "Reflowable text for Kindle, Apple Books and every e-reader.",
    recommended: false,
  },
  {
    id: "docx",
    name: "DOCX",
    blurb: "A Word document, to keep editing or hand to a designer.",
    recommended: false,
  },
] as const;

type ExportFormat = (typeof EXPORT_FORMATS)[number]["id"];

/**
 * The preview page: the whole book, turned page by page, the theme beside
 * it, and the way forward — pick a format — at the foot.
 */
export function BookPreview({
  bookId,
  title,
  subtitle,
  author,
  coverUrl,
  design,
  themes,
  initialThemeId,
  chapters,
}: {
  bookId: string;
  title: string;
  subtitle: string | null;
  author: string;
  coverUrl: string | null;
  design: BookDesign;
  themes: BookTheme[];
  initialThemeId: string;
  chapters: Chapter[];
}) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];
  const [pickingTheme, setPickingTheme] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [active, setActive] = useState(0);
  const reader = useRef<ReaderControls | null>(null);

  const sources = useMemo(
    () => chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, markdown: chapter.body })),
    [chapters],
  );
  const sample = chapters[active] ?? chapters[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Preview</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Link
          href={`/studio/${bookId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the studio
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border-2 border-border bg-background p-3 lg:sticky lg:top-6">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Chapters</p>
          <ol className="mt-1 space-y-0.5">
            {chapters.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(item.position);
                    reader.current?.goToChapter(item.position);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active === item.position
                      ? "bg-primary/25 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="mr-2 text-xs opacity-60">{item.position + 1}.</span>
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            aria-pressed={pickingTheme}
            onClick={() => setPickingTheme((open) => !open)}
            className={cn(
              "mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              pickingTheme ? "bg-primary-soft text-primary-strong" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Palette className="size-3.5" aria-hidden="true" />
            Theme · {theme.name}
          </button>
        </aside>

        <div className="min-w-0 space-y-6">
          {pickingTheme && sample ? (
            <ThemePicker
              bookId={bookId}
              design={design}
              themes={themes}
              themeId={theme.id}
              markdown={sample.body}
              chapterNumber={sample.position + 1}
              chapterTitle={sample.title}
              bookTitle={title}
              onChange={setThemeId}
            />
          ) : null}

          <section className="rounded-2xl border-2 border-foreground bg-background p-4 shadow-sm sm:p-6 lg:p-8">
            <p className="mb-4 text-center text-xs text-muted-foreground">
              Drag a page edge or use the arrows. This is the file your readers will get.
            </p>
            <BookReader
              bookTitle={title}
              subtitle={subtitle}
              author={author}
              coverUrl={coverUrl}
              chapters={sources}
              design={design}
              theme={theme}
              controlsRef={reader}
              onChapterChange={setActive}
            />
          </section>

          <section className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">Next step</p>
            <p className="mt-1 font-display text-lg font-semibold">Choose your format</p>
            <div role="radiogroup" aria-label="Export format" className="mt-4 grid gap-3 sm:grid-cols-3">
              {EXPORT_FORMATS.map((item) => {
                const selected = item.id === format;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFormat(item.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 bg-background p-4 text-left transition-colors",
                      selected ? "border-foreground" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 font-display text-base font-bold">
                        {item.id === "pdf" ? (
                          <FileText className="size-4" aria-hidden="true" />
                        ) : (
                          <BookText className="size-4" aria-hidden="true" />
                        )}
                        {item.name}
                      </span>
                      {selected ? (
                        <Check className="size-4 text-primary-strong" aria-hidden="true" />
                      ) : item.recommended ? (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-strong">
                          Recommended
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{item.blurb}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Export comes with Pro. It is the next thing we are building; your choice is remembered here.
              </p>
              <button
                type="button"
                disabled
                title="Export is coming next"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary opacity-60"
              >
                Continue to export
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
