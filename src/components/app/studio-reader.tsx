"use client";

import { useState } from "react";
import Link from "next/link";
import { BookImage, Eye, Palette, PenLine } from "lucide-react";
import { BookCardActions } from "@/components/app/book-card-actions";
import { ChapterEditor } from "@/components/app/chapter-editor";
import { ResumeIdeaLink } from "@/components/app/resume-idea-link";
import { BookPage } from "@/components/book/book-page";
import { ThemePicker } from "@/components/app/theme-picker";
import { CoverStudio, type CoverState } from "@/components/app/cover-studio";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";

type Chapter = {
  id: string;
  position: number;
  title: string;
  body: string;
};

export function StudioReader({
  bookId,
  title,
  subtitle,
  idea,
  status,
  design,
  themes,
  initialThemeId,
  cover,
  chapters,
}: {
  bookId: string;
  title: string;
  subtitle: string | null;
  idea: string;
  status: string;
  /** The format's typographic identity. */
  design: BookDesign;
  /** The three variations available for this format. */
  themes: BookTheme[];
  /** The stored choice, or the deterministic default for this book. */
  initialThemeId: string;
  cover: CoverState;
  chapters: Chapter[];
}) {
  /* The cover tab edits the title live; the header follows. */
  const [bookTitle, setBookTitle] = useState(title);
  const [active, setActive] = useState(0);
  const chapter = chapters[active] ?? chapters[0];
  const [mode, setMode] = useState<"edit" | "preview" | "cover">("edit");
  const [themeId, setThemeId] = useState(initialThemeId);
  const [pickingTheme, setPickingTheme] = useState(false);
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];
  /* What is in the editor right now, saved or not, so Preview never lags. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  /* The markdown the server last confirmed for each chapter. Switching
     chapters and coming back shows the saved edits, not the page-load copy. */
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(chapters.map((item) => [item.id, item.body])),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {status === "ready" ? "Preview" : status}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            {bookTitle}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">Idea: {idea}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/books"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            ← My eBooks
          </Link>
          <BookCardActions bookId={bookId} title={bookTitle} redirectTo="/books" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border-2 border-border bg-background p-3 lg:sticky lg:top-6">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Chapters
          </p>
          <ol className="mt-1 space-y-0.5">
            {chapters.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.position)}
                  className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active === item.position
                      ? "bg-primary/25 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="mr-2 text-xs opacity-60">
                    {item.position + 1}.
                  </span>
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <article className="min-h-[70vh] rounded-2xl border-2 border-foreground bg-background p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">
                {mode === "cover"
                  ? "Cover"
                  : `${chapter?.position != null ? `${chapter.position + 1}. ` : ""}${chapter?.title ?? "Chapter"}`}
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {mode === "edit"
                  ? "Click into the text to edit. Changes save on their own."
                  : mode === "preview"
                    ? "How this chapter reads as a book."
                    : "Three complete covers per run. Pick the one you want."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-pressed={pickingTheme}
              onClick={() => {
                setPickingTheme((open) => !open);
                setMode("preview");
              }}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                pickingTheme ? "bg-primary-soft text-primary-strong" : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Palette className="size-3.5" aria-hidden="true" />
              Theme
            </button>
            <div
              role="group"
              aria-label="Studio mode"
              className="inline-flex shrink-0 rounded-full border border-border bg-background p-0.5"
            >
              {(
                [
                  { value: "edit", label: "Edit", icon: PenLine },
                  { value: "preview", label: "Preview", icon: Eye },
                  { value: "cover", label: "Cover", icon: BookImage },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mode === item.value}
                  onClick={() => setMode(item.value)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    mode === item.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          {/* Kept mounted and only hidden: covers generated in this session
              must survive a trip to Edit or Preview and back. */}
          <div className="mt-6" hidden={mode !== "cover"}>
            <CoverStudio bookId={bookId} initial={cover} />
          </div>

          {chapter && pickingTheme && mode !== "cover" ? (
            <div className="mt-5">
              <ThemePicker
                bookId={bookId}
                design={design}
                themes={themes}
                themeId={theme.id}
                markdown={drafts[chapter.id] ?? bodies[chapter.id] ?? chapter.body}
                chapterNumber={chapter.position + 1}
                chapterTitle={chapter.title}
                bookTitle={bookTitle}
                onChange={setThemeId}
              />
            </div>
          ) : null}

          {chapter && mode !== "cover" ? (
            <>
              {/* The editor stays mounted while previewing so pending edits
                  and their save keep running; it is only hidden. */}
              <div className="mt-6" hidden={mode !== "edit"}>
                {/* One editor, one chapter: the key tears it down and rebuilds
                    it on every switch, so the whole book is never loaded at once. */}
                <ChapterEditor
                  key={chapter.id}
                  bookId={bookId}
                  chapterId={chapter.id}
                  markdown={bodies[chapter.id] ?? chapter.body}
                  onSaved={(chapterId, markdown) =>
                    setBodies((prev) => ({ ...prev, [chapterId]: markdown }))
                  }
                  onDraft={(chapterId, markdown) =>
                    setDrafts((prev) => ({ ...prev, [chapterId]: markdown }))
                  }
                />
              </div>
              {mode === "preview" ? (
                <div className="mt-6">
                  <BookPage
                    markdown={drafts[chapter.id] ?? bodies[chapter.id] ?? chapter.body}
                    design={design}
                    theme={theme}
                    chapterNumber={chapter.position + 1}
                    chapterTitle={chapter.title}
                    bookTitle={bookTitle}
                    folio={chapter.position + 1}
                    className="rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_40px_-16px_rgba(0,0,0,0.25)]"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </article>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6">
        <p className="font-display text-base font-semibold text-primary-strong">
          Preview is free — download comes with Pro
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF / EPUB export and cover polish come next.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
          <ResumeIdeaLink
            idea={idea}
            className="text-primary underline-offset-4 hover:underline"
          >
            Generate another
          </ResumeIdeaLink>
          <Link
            href={`/studio/${bookId}`}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Refresh
          </Link>
        </div>
      </div>
    </div>
  );
}
