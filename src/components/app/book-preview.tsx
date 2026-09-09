"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Folder as FolderIcon, Loader2, Palette } from "lucide-react";
import { UpgradePanel } from "@/components/app/upgrade-panel";
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

/* What the pack holds, folder by folder — the same list the server builds. */
const PACK_FOLDERS = [
  { name: "Amazon KDP", files: "eBook EPUB, paperback interior and print cover PDFs, cover" },
  { name: "Apple Books", files: "EPUB, cover" },
  { name: "Kobo", files: "EPUB, cover" },
  { name: "Etsy", files: "Digital PDF, cover" },
  { name: "Gumroad", files: "Digital PDF, EPUB, cover" },
  { name: "Your own site", files: "Digital PDF, EPUB, cover" },
  { name: "Editable", files: "Word document (DOCX)" },
] as const;

const EXPORT_ERROR: Record<string, string> = {
  nothing_to_export: "This book has no finished chapter to export yet.",
  format_not_available: "That format is not available yet.",
  pdf_failed: "The PDF could not be produced. Try again in a moment.",
  pack_failed: "The pack could not be produced. Try again in a moment.",
  rate_limited: "Too many exports in a row. Give it a minute.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  upgrade_required: "Exports come with a plan. Upgrade to download your files.",
};

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
  canExport,
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
  /** False on the free plan: the pack is described, the button is a wall. */
  canExport: boolean;
  chapters: Chapter[];
}) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];
  const [pickingTheme, setPickingTheme] = useState(false);
  const [pages, setPages] = useState<number | null>(null);
  /* KDP prints nothing under 24 interior pages; the interior is the book
     minus its cover and the blank page behind it. */
  const interiorPages = pages != null ? Math.max(0, pages - 2) : null;
  const KDP_MIN_PAGES = 24;
  const printTooShort = interiorPages != null && interiorPages < KDP_MIN_PAGES;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const reader = useRef<ReaderControls | null>(null);

  /* The zip comes back as bytes and is handed to the browser as a
     download, named by the server after the book's title. */
  async function exportBook() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pack" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "export_failed");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "book-pack.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setExportError(EXPORT_ERROR[code] ?? "The export did not go through. Try again in a moment.");
    } finally {
      setExporting(false);
    }
  }

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
              onPages={setPages}
            />
          </section>

          {!canExport ? (
            <UpgradePanel
              title="Download your book pack"
              body="Your book is written and every page is readable here. The files themselves — the KDP paperback interior, EPUB, PDF, DOCX and the HD cover, one folder per store — come with a plan."
            />
          ) : null}

          <section className={cn("rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6", !canExport && "hidden")}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">Next step</p>
            <p className="mt-1 font-display text-lg font-semibold">Download your book pack</p>
            <p className="mt-2 text-sm text-muted-foreground">
              One download, one folder per store, and in each folder exactly the files that store takes.
              A READ-ME inside says what to upload where.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {PACK_FOLDERS.map((folder) => (
                <li key={folder.name} className="flex items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5">
                  <FolderIcon className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{folder.name}</span>
                    <span className="block text-xs text-muted-foreground">{folder.files}</span>
                  </span>
                </li>
              ))}
            </ul>
            {interiorPages != null ? (
              <p className={cn("mt-3 text-xs", printTooShort ? "text-destructive" : "text-muted-foreground")}>
                {printTooShort
                  ? `KDP prints books of ${KDP_MIN_PAGES} pages or more; this one has ${interiorPages} interior pages, so the pack has no paperback interior yet. The eBook files are all there.`
                  : `${interiorPages} interior pages: the paperback interior for KDP is included.`}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                The PDFs are printed from these very pages; a long book takes up to a minute.
              </p>
              <button
                type="button"
                onClick={() => void exportBook()}
                disabled={exporting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                {exporting ? "Preparing your pack…" : "Download the book pack"}
              </button>
            </div>
            {exportError ? (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {exportError}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
