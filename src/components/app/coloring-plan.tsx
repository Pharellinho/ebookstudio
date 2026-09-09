"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Download, Folder as FolderIcon, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { UpgradePanel } from "@/components/app/upgrade-panel";
import { BookCardActions } from "@/components/app/book-card-actions";
import { ColoringPages, type ColoringPageView } from "@/components/app/coloring-pages";
import { CoverStudio, type CoverState } from "@/components/app/cover-studio";
import { ColoringReader } from "@/components/book/coloring-reader";
import {
  MAX_COLORING_PAGES,
  MIN_COLORING_PAGES,
  PAGE_SIZES,
  ageBandLabel,
  lineStyleLabel,
  type ColoringSettings,
} from "@/lib/coloring";
import { cn } from "@/lib/cn";

type Scene = { scene: string; detail: string };

const SAVE_DELAY_MS = 1200;

/**
 * The plan of a coloring book: one line per page, editable, saved on its
 * own. A page can be rethought, removed or added; the drawing step comes
 * after and reads this list.
 */
export function ColoringPlan({
  bookId,
  title,
  subtitle,
  author,
  settings,
  scenes: initial,
  pages: initialPages,
  canExport,
  cover,
}: {
  bookId: string;
  title: string;
  subtitle: string;
  author: string;
  settings: ColoringSettings | null;
  scenes: Scene[];
  /** The drawn (or drawing) pages; empty until the author starts drawing. */
  pages: ColoringPageView[];
  /** False on the free plan: drawing and the pack come with a plan. */
  canExport: boolean;
  cover: CoverState;
}) {
  const [scenes, setScenes] = useState<Scene[]>(initial);
  /* Once pages exist the drawing grid is the main view and the plan folds up. */
  const [pages, setPages] = useState<ColoringPageView[]>(initialPages);
  const [pagesKey, setPagesKey] = useState(0);
  const [planOpen, setPlanOpen] = useState(initialPages.length === 0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const drawing = pages.length > 0;
  const [allReady, setAllReady] = useState(pages.length > 0 && pages.every((page) => page.status === "ready" && !page.stale));
  const [blankVersos, setBlankVersos] = useState(Boolean(settings?.blankVersos));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [readerKey, setReaderKey] = useState(0);
  const chosenCoverUrl = cover.candidates.find((item) => item.path === cover.chosen)?.url ?? null;
  const [coverUrl, setCoverUrl] = useState<string | null>(chosenCoverUrl);
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving" | "error">("saved");
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  /* What the debounced save should send: always the newest list. */
  const latest = useRef(scenes);
  useEffect(() => {
    latest.current = scenes;
  }, [scenes]);

  /* Save shortly after the last keystroke, as the chapter editor does. */
  function scheduleSave() {
    setSaveState("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  async function save() {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: {
            title,
            subtitle,
            chapters: latest.current.map((scene) => ({ title: scene.scene, summary: scene.detail })),
          },
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
      if (res.ok && latest.current.length > 0 && drawingRef.current) await syncPages();
    } catch {
      setSaveState("error");
    }
  }

  const drawingRef = useRef(drawing);
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  /* Rows follow the plan: new lines get a page, changed lines mark theirs
     as needing a redraw. The grid is rebuilt so its queue sees them. */
  async function syncPages(): Promise<boolean> {
    const res = await fetch(`/api/books/${bookId}/pages`, { method: "POST" });
    const json = (await res.json().catch(() => null)) as { pages?: ColoringPageView[]; error?: string } | null;
    if (!res.ok || !json?.pages) {
      setStartError(
        json?.error === "pages_table_missing"
          ? "The pages table is missing in the database (migration 0013)."
          : "Could not prepare the pages. Try again in a moment.",
      );
      return false;
    }
    setPages(json.pages);
    setPagesKey((key) => key + 1);
    return true;
  }

  async function startDrawing() {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    window.clearTimeout(timer.current);
    if (saveState !== "saved") await save();
    const ok = await syncPages();
    setStarting(false);
    if (ok) {
      setPlanOpen(false);
      /* The welcome cover, drawn alongside the pages, from the plan alone.
         Free of the three-run cap; its failure changes nothing here. */
      if (!coverUrl) {
        void fetch(`/api/books/${bookId}/cover/welcome`, { method: "POST" })
          .then((res) => res.json())
          .then((json: { candidate?: { url?: string | null } }) => {
            if (json.candidate?.url) setCoverUrl(json.candidate.url);
          })
          .catch(() => undefined);
      }
    }
  }

  /* The blank-verso choice lives with the book's settings. */
  async function toggleBlankVersos(next: boolean) {
    if (!settings) return;
    setBlankVersos(next);
    setReaderKey((key) => key + 1);
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { ...settings, blankVersos: next } }),
    }).catch(() => undefined);
  }

  async function downloadPack() {
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
        throw new Error(json?.error ?? "pack_failed");
      }
      const blob = await res.blob();
      const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "coloring-pack.zip";
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
      setExportError(
        code === "pages_not_ready"
          ? "Every page must be drawn before the pack can be made."
          : code === "upgrade_required"
            ? "The coloring pack comes with a plan. Upgrade to download it."
            : "The pack could not be produced. Try again in a moment.",
      );
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function update(index: number, patch: Partial<Scene>) {
    setScenes((prev) => prev.map((scene, i) => (i === index ? { ...scene, ...patch } : scene)));
    scheduleSave();
  }

  function remove(index: number) {
    if (scenes.length <= MIN_COLORING_PAGES) return;
    setScenes((prev) => prev.filter((_, i) => i !== index));
    scheduleSave();
  }

  /* A fresh idea for one page, or one more page, from the same planner,
     told what already exists so it never repeats a scene. */
  async function fresh(count: number): Promise<Scene[] | null> {
    if (!settings) return null;
    setError(null);
    const res = await fetch("/api/coloring/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings,
        title,
        existing: latest.current.map((scene) => scene.scene),
        count,
      }),
    });
    const json = (await res.json().catch(() => null)) as { scenes?: Scene[]; error?: string } | null;
    if (!res.ok || !json?.scenes?.length) {
      setError(
        json?.error === "rate_limited"
          ? "You've asked for a lot of pages this hour. Give it a little while."
          : "No new page came back. Try again in a moment.",
      );
      return null;
    }
    return json.scenes;
  }

  async function rethink(index: number) {
    if (refreshing != null) return;
    setRefreshing(index);
    const made = await fresh(1);
    setRefreshing(null);
    if (made) update(index, made[0]);
  }

  async function addPage() {
    if (adding || scenes.length >= MAX_COLORING_PAGES) return;
    setAdding(true);
    const made = await fresh(1);
    setAdding(false);
    if (made) {
      setScenes((prev) => [...prev, made[0]]);
      scheduleSave();
    }
  }

  const size = PAGE_SIZES.find((item) => item.id === settings?.pageSize) ?? PAGE_SIZES[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Coloring book · plan</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            {settings ? (
              <>
                <span className="rounded-full bg-muted px-3 py-1">Ages {ageBandLabel(settings.ageBand)}</span>
                <span className="rounded-full bg-muted px-3 py-1">{lineStyleLabel(settings.lineStyle)}</span>
                <span className="rounded-full bg-muted px-3 py-1">{size.label}</span>
              </>
            ) : null}
            <span className="rounded-full bg-muted px-3 py-1">{scenes.length} pages</span>
            {author ? <span className="rounded-full bg-muted px-3 py-1">by {author}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/books" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            ← My eBooks
          </Link>
          <BookCardActions bookId={bookId} title={title} redirectTo="/books" />
        </div>
      </div>

      {drawing ? (
        <ColoringPages
          key={pagesKey}
          bookId={bookId}
          initial={pages}
          onAllReady={() => setAllReady(true)}
          onPagesChange={setPages}
        />
      ) : null}

      {drawing ? (
        <section className="rounded-2xl border-2 border-foreground bg-background p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-bold">Cover</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A first cover is drawn while the pages are; three more per run if you want to choose.
          </p>
          <div className="mt-5">
            <CoverStudio bookId={bookId} title={title} initial={cover} />
          </div>
        </section>
      ) : null}

      {drawing && allReady ? (
        <>
          <section className="rounded-2xl border-2 border-foreground bg-background p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Read it</h2>
                <p className="mt-1 text-xs text-muted-foreground">Drag a page edge or use the arrows.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={blankVersos}
                  onChange={(event) => void toggleBlankVersos(event.target.checked)}
                  className="size-4 accent-[var(--color-primary)]"
                />
                Blank page behind every picture (for markers)
              </label>
            </div>
            <ColoringReader
              key={readerKey}
              title={title}
              subtitle={subtitle || null}
              author={author}
              coverUrl={coverUrl}
              pages={pages.map((page) => ({ position: page.position, scene: page.scene, url: page.url }))}
              blankVersos={blankVersos}
            />
          </section>

          {!canExport ? (
            <UpgradePanel
              title="Download your coloring pack"
              body="The pack — KDP paperback interior and print cover, printable PDF, every page as PNG, one folder per store — comes with a plan."
            />
          ) : null}

          <section className={cn("rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6", !canExport && "hidden")}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">Next step</p>
            <p className="mt-1 font-display text-lg font-semibold">Download your coloring pack</p>
            <p className="mt-2 text-sm text-muted-foreground">
              One download, one folder per store. A READ-ME inside says what to upload where.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[
                { name: "Amazon KDP", files: "Paperback interior and print cover PDFs, cover" },
                { name: "Etsy", files: "Printable PDF, cover, every page as PNG" },
                { name: "Gumroad", files: "Printable PDF, cover, every page as PNG" },
                { name: "Your own site", files: "Printable PDF, cover, every page as PNG" },
              ].map((folder) => (
                <li key={folder.name} className="flex items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5">
                  <FolderIcon className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{folder.name}</span>
                    <span className="block text-xs text-muted-foreground">{folder.files}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {pages.length + (blankVersos ? pages.length : 0) + 2 >= 24
                ? `${pages.length + (blankVersos ? pages.length : 0) + 2} interior pages: the paperback interior for KDP is included.`
                : `KDP prints books of 24 pages or more; this interior would have ${pages.length + (blankVersos ? pages.length : 0) + 2}. Add pictures or turn on the blank pages to reach it; the printable files are all there.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => void downloadPack()}
                disabled={exporting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                {exporting ? "Preparing your pack…" : "Download the coloring pack"}
              </button>
            </div>
            {exportError ? (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {exportError}
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      <div className="rounded-2xl border-2 border-foreground bg-background p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">
              {drawing ? (
                <button
                  type="button"
                  onClick={() => setPlanOpen((open) => !open)}
                  aria-expanded={planOpen}
                  className="inline-flex cursor-pointer items-center gap-2"
                >
                  The plan
                  <ChevronDown className={cn("size-4 transition-transform", planOpen && "rotate-180")} aria-hidden="true" />
                </button>
              ) : (
                "One scene per page"
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {drawing
                ? "Change a line and its page is marked for a redraw."
                : "Edit any line, rethink a page, add or remove pages. Changes save on their own."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {saveState === "saving" || saveState === "pending" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : saveState === "saved" ? (
              <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
            ) : null}
            {saveState === "saved" ? "Saved" : saveState === "error" ? "Could not save" : "Saving…"}
          </span>
        </div>

        <ol className={cn("mt-5 space-y-3", !planOpen && "hidden")}>
          {scenes.map((scene, index) => (
            <li key={index} className="rounded-xl border border-border bg-surface p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 w-7 shrink-0 text-right font-display text-sm font-bold tabular-nums text-primary-strong">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={scene.scene}
                    maxLength={120}
                    aria-label={`Page ${index + 1} scene`}
                    onChange={(event) => update(index, { scene: event.target.value })}
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-base font-bold outline-none hover:border-border focus:border-primary"
                  />
                  <textarea
                    value={scene.detail}
                    maxLength={400}
                    rows={2}
                    aria-label={`Page ${index + 1} brief`}
                    onChange={(event) => update(index, { detail: event.target.value })}
                    className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-muted-foreground outline-none hover:border-border focus:border-primary focus:text-foreground"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    title="Rethink this page"
                    aria-label={`Rethink page ${index + 1}`}
                    disabled={refreshing != null || !settings}
                    onClick={() => void rethink(index)}
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshing === index ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={scenes.length <= MIN_COLORING_PAGES ? `A book keeps at least ${MIN_COLORING_PAGES} pages` : "Remove this page"}
                    aria-label={`Remove page ${index + 1}`}
                    disabled={scenes.length <= MIN_COLORING_PAGES}
                    onClick={() => remove(index)}
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className={cn("mt-4 flex flex-wrap items-center justify-between gap-3", !planOpen && "hidden")}>
          <button
            type="button"
            disabled={adding || scenes.length >= MAX_COLORING_PAGES || !settings}
            onClick={() => void addPage()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
            Add a page
          </button>
          <span className="text-xs text-muted-foreground">
            {scenes.length} of {MAX_COLORING_PAGES} pages at most
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {!drawing ? (
        <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">Next step</p>
          <p className="mt-1 font-display text-lg font-semibold">Draw the pages</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Every page is drawn from its line above, as clean black outlines on white, {size.label}, ready for
            print. Two pages at a time; a {scenes.length}-page book takes a few minutes. You can leave and
            come back: the drawing resumes where it stopped.
          </p>
          <button
            type="button"
            disabled={starting || !settings}
            onClick={() => void startDrawing()}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Draw the pages
          </button>
          {startError ? (
            <p role="alert" className="mt-3 text-xs text-destructive">
              {startError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
