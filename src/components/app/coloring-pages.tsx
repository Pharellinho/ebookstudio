"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, Square, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type ColoringPageView = {
  id: string;
  position: number;
  scene: string;
  detail: string;
  status: "pending" | "drawing" | "ready" | "failed";
  image_path: string | null;
  redraws: number;
  stale: boolean;
  url: string | null;
};

/* Two pictures in flight at once: fast enough, gentle on the model's limits. */
const CONCURRENCY = 2;
const REDRAW_CAP = 3;

const ERROR_TEXT: Record<string, string> = {
  page_failed: "The model could not draw this page. Try again.",
  redraw_cap: "This page has been redrawn as many times as allowed.",
  rate_limited: "Too many pages this hour. Give it a little while.",
  already_drawing: "This page is already being drawn.",
  openai_not_configured: "The image model isn't connected on this server.",
  no_settings: "This book has no settings; start it again from the brief.",
};

/**
 * The pages of a coloring book being drawn: a grid of cards that fill in
 * one by one. The queue runs in the browser, a couple of pages at a time,
 * so a closed tab simply pauses the work; opening the book resumes it.
 */
export function ColoringPages({
  bookId,
  initial,
  onAllReady,
  onPagesChange,
}: {
  bookId: string;
  initial: ColoringPageView[];
  onAllReady?: () => void;
  /** Every change to the pages, so the reader and the pack see fresh pictures. */
  onPagesChange?: (pages: ColoringPageView[]) => void;
}) {
  const [pages, setPages] = useState<ColoringPageView[]>(initial);
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stop = useRef(false);
  const inFlight = useRef(new Set<number>());
  const latest = useRef(pages);
  useEffect(() => {
    latest.current = pages;
  }, [pages]);

  const ready = pages.filter((page) => page.status === "ready" && !page.stale).length;
  const total = pages.length;
  const allReady = total > 0 && ready === total;

  useEffect(() => {
    if (allReady) onAllReady?.();
  }, [allReady, onAllReady]);

  useEffect(() => {
    onPagesChange?.(pages);
  }, [pages, onPagesChange]);

  function patch(position: number, next: Partial<ColoringPageView>) {
    setPages((prev) => prev.map((page) => (page.position === position ? { ...page, ...next } : page)));
  }

  async function drawOne(position: number, redraw = false): Promise<void> {
    if (inFlight.current.has(position)) return;
    inFlight.current.add(position);
    patch(position, { status: "drawing" });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
    try {
      const res = await fetch(`/api/books/${bookId}/pages/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, redraw }),
      });
      const json = (await res.json().catch(() => null)) as { page?: ColoringPageView; error?: string } | null;
      if (!res.ok || !json?.page) throw new Error(json?.error ?? "page_failed");
      patch(position, json.page);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setErrors((prev) => ({ ...prev, [position]: ERROR_TEXT[code] ?? "Something went wrong. Try again." }));
      patch(position, { status: latest.current.find((p) => p.position === position)?.image_path ? "ready" : "failed" });
    } finally {
      inFlight.current.delete(position);
    }
  }

  /* Everything not yet drawn, a couple at a time, until done or stopped. */
  async function runQueue() {
    if (running) return;
    setRunning(true);
    stop.current = false;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (!stop.current) {
        const next = latest.current.find(
          (page) =>
            !inFlight.current.has(page.position) &&
            (page.status === "pending" || page.status === "failed" || page.stale),
        );
        if (!next) return;
        await drawOne(next.position, next.stale);
      }
    });
    await Promise.all(workers);
    setRunning(false);
  }

  /* Start on arrival when there is work; the button restarts after a stop.
     No "already started" guard: in development React mounts, unmounts and
     mounts again, and a guard set on the first pass silenced the second. The
     cleanup clears the pending start instead. */
  useEffect(() => {
    if (!initial.some((page) => page.status !== "ready" || page.stale)) return;
    const id = window.setTimeout(() => void runQueue(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      stop.current = true;
    },
    [],
  );

  /* A page can be "drawing" on the server without this tab having asked
     for it: a request from an earlier visit still running. Ask the server
     every few seconds until such pages settle. */
  useEffect(() => {
    const foreignDrawing = pages.some((page) => page.status === "drawing" && !inFlight.current.has(page.position));
    if (!foreignDrawing) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/pages`);
        const json = (await res.json().catch(() => null)) as { pages?: ColoringPageView[] } | null;
        if (!res.ok || !json?.pages) return;
        setPages((prev) =>
          prev.map((page) => {
            if (inFlight.current.has(page.position)) return page;
            const fresh = json.pages?.find((item) => item.position === page.position);
            return fresh ?? page;
          }),
        );
      } catch {
        // Next tick will try again.
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [pages, bookId]);

  const pendingCount = pages.filter((page) => page.status === "pending" || page.status === "failed" || page.stale).length;

  return (
    <div className="rounded-2xl border-2 border-foreground bg-background p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Drawing the pages</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Black lines on white, ready to print. Each page can be redrawn up to {REDRAW_CAP} times.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {ready} of {total} drawn
          </span>
          {running ? (
            <button
              type="button"
              onClick={() => {
                stop.current = true;
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-destructive/40 hover:text-destructive"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
              Stop
            </button>
          ) : pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => void runQueue()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-on-primary hover:bg-primary-strong"
            >
              Resume drawing
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${total > 0 ? Math.round((ready / total) * 100) : 0}%` }}
        />
      </div>

      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <li key={page.id} className="flex flex-col rounded-xl border border-border bg-surface p-3">
            <div
              className={cn(
                "relative aspect-[8.5/11] overflow-hidden rounded-lg border border-border bg-white",
                page.status === "drawing" && "animate-pulse",
              )}
            >
              {page.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.url} alt={`Page ${page.position + 1}: ${page.scene}`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {page.status === "drawing" ? "Drawing…" : page.status === "failed" ? "Not drawn" : "Waiting"}
                </div>
              )}
              {page.status === "drawing" ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-background/90 py-1.5 text-[11px] font-semibold">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Drawing
                </span>
              ) : page.stale ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-primary-soft py-1.5 text-[11px] font-semibold text-primary-strong">
                  <TriangleAlert className="size-3.5" aria-hidden="true" />
                  Plan changed
                </span>
              ) : page.status === "ready" ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-background p-1">
                  <Check className="size-3 text-emerald-700" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold leading-snug">
                <span className="mr-1.5 text-primary-strong">{page.position + 1}</span>
                <span className="line-clamp-2">{page.scene}</span>
              </p>
              <button
                type="button"
                title={page.redraws >= REDRAW_CAP ? "No redraws left for this page" : `Redraw (${REDRAW_CAP - page.redraws} left)`}
                aria-label={`Redraw page ${page.position + 1}`}
                disabled={page.status === "drawing" || page.redraws >= REDRAW_CAP || !page.image_path}
                onClick={() => void drawOne(page.position, true)}
                className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {errors[page.position] ? (
              <p role="alert" className="mt-1 text-[11px] text-destructive">
                {errors[page.position]}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
