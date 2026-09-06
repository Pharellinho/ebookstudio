"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { COVER_AUTHOR_MAX, COVER_RUN_CAP, COVERS_PER_RUN } from "@/lib/cover-rules";
import { cn } from "@/lib/cn";

export type CoverCandidateView = {
  path: string;
  url: string | null;
  variant: string;
  createdAt: string;
};

export type CoverState = {
  candidates: CoverCandidateView[];
  /** Path of the chosen cover, or null. */
  chosen: string | null;
  runs: number;
  author: string;
};

function friendlyError(status: number | null, code?: string): string {
  if (status === 429 && code === "cover_cap") return `This book has used all ${COVER_RUN_CAP} cover runs.`;
  if (status === 429) return "Too many cover runs this hour — try again later.";
  if (status === 400 && code === "invalid_author") return "Add the author name first: it is drawn on the cover.";
  if (status === 503 && code === "cover_columns_missing") return "Covers can't be stored yet — the database is missing the cover columns (migration 0011).";
  if (status === 503) return "The image model is unavailable right now.";
  if (status === 502) return "The image model could not draw these. That run still counts; try again in a moment.";
  if (status === null) return "Could not reach the server. Check your connection.";
  return "Could not generate the covers. Try again in a moment.";
}

const VARIANT_LABEL: Record<string, string> = {
  illustrated: "Illustrated",
  photographic: "Photographic",
  typographic: "Bold & minimal",
};

/**
 * The Cover tab: one click draws three complete covers — title, subtitle and
 * author name included — and the author picks one. Only the run costs
 * anything; choosing is free.
 */
export function CoverStudio({
  bookId,
  initial,
}: {
  bookId: string;
  initial: CoverState;
}) {
  const [state, setState] = useState<CoverState>(initial);
  const [generating, setGenerating] = useState(false);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, COVER_RUN_CAP - state.runs);
  const chosen = state.candidates.find((c) => c.path === state.chosen) ?? null;
  const latest = state.candidates.slice(-COVERS_PER_RUN);
  const earlier = state.candidates.slice(0, -COVERS_PER_RUN);

  async function generate() {
    if (generating || remaining === 0) return;
    if (!state.author.trim()) {
      setError("Add the author name first: it is drawn on the cover.");
      return;
    }
    setGenerating(true);
    setError(null);
    type Reply = { candidates?: CoverCandidateView[]; chosen?: string | null; runs?: number; error?: string; partial?: boolean };
    let status: number | null = null;
    let json: Reply | null = null;
    try {
      const res = await fetch(`/api/books/${bookId}/cover/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: state.author.trim().slice(0, COVER_AUTHOR_MAX),
        }),
      });
      status = res.status;
      json = (await res.json().catch(() => null)) as Reply | null;
    } catch {
      status = null;
    }
    setGenerating(false);
    if (typeof json?.runs === "number") {
      const runs = json.runs;
      setState((prev) => ({ ...prev, runs }));
    }
    if (status !== 200 || !json?.candidates) {
      setError(friendlyError(status, json?.error));
      return;
    }
    const candidates = json.candidates;
    setState((prev) => ({ ...prev, candidates }));
    if (json.partial) setError("One of the three covers could not be drawn; here are the others.");
  }

  async function choose(path: string) {
    if (choosing || path === state.chosen) return;
    setChoosing(path);
    setError(null);
    let ok = false;
    try {
      const res = await fetch(`/api/books/${bookId}/cover/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    setChoosing(null);
    if (!ok) {
      setError("Could not save your choice. Try again in a moment.");
      return;
    }
    setState((prev) => ({ ...prev, chosen: path }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        {chosen?.url ? (
          <figure className="mx-auto max-w-[24rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chosen.url}
              alt="Chosen cover"
              className="w-full rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06),0_24px_48px_-20px_rgba(0,0,0,0.35)]"
            />
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              Your cover · {VARIANT_LABEL[chosen.variant] ?? chosen.variant}
            </figcaption>
          </figure>
        ) : (
          <div className="mx-auto flex aspect-[2/3] max-w-[24rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface p-6 text-center">
            <p className="font-display text-base font-semibold">No cover yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the author name, then generate three covers and pick one.
            </p>
          </div>
        )}

        {generating ? (
          <div role="status" className="mt-8">
            <p className="text-center text-xs text-muted-foreground">Drawing three covers…</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {Array.from({ length: COVERS_PER_RUN }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        ) : null}

        {!generating && latest.length > 0 ? (
          <CandidateGrid
            title="Latest run — pick one"
            items={latest}
            chosen={state.chosen}
            choosing={choosing}
            onChoose={choose}
          />
        ) : null}
        {!generating && earlier.length > 0 ? (
          <CandidateGrid
            title="Earlier runs"
            items={earlier}
            chosen={state.chosen}
            choosing={choosing}
            onChoose={choose}
            compact
          />
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="cover-author" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Author name on the cover
          </label>
          <input
            id="cover-author"
            value={state.author}
            maxLength={COVER_AUTHOR_MAX}
            onChange={(event) => setState((prev) => ({ ...prev, author: event.target.value }))}
            placeholder="Exactly as it should appear"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || remaining === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-on-primary hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-3.5" aria-hidden="true" />
            )}
            Generate {COVERS_PER_RUN} covers
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {remaining} of {COVER_RUN_CAP} runs left
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each run draws {COVERS_PER_RUN} complete covers — illustrated, photographic and
          typographic — with the title, subtitle and author name in the picture. Check the
          spelling before you choose: what you see is the final file.
        </p>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CandidateGrid({
  title,
  items,
  chosen,
  choosing,
  onChoose,
  compact = false,
}: {
  title: string;
  items: CoverCandidateView[];
  chosen: string | null;
  choosing: string | null;
  onChoose: (path: string) => void;
  compact?: boolean;
}) {
  return (
    <section className="mt-8">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div role="radiogroup" aria-label={title} className={cn("mt-3 grid gap-3", compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-3")}>
        {items.map((item) => {
          const active = item.path === chosen;
          return (
            <button
              key={item.path}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={choosing != null}
              onClick={() => onChoose(item.path)}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-lg border-2 bg-muted text-left transition-colors disabled:cursor-wait",
                active ? "border-foreground" : "border-transparent hover:border-primary/60",
              )}
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={`Cover option, ${VARIANT_LABEL[item.variant] ?? item.variant}`} className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="aspect-[2/3] w-full" />
              )}
              {!compact ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/90 px-2 py-1.5 text-[11px] font-semibold">
                  {VARIANT_LABEL[item.variant] ?? item.variant}
                  {choosing === item.path ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : active ? (
                    <Check className="size-3.5 text-primary-strong" aria-hidden="true" />
                  ) : (
                    <span className="text-muted-foreground">Use this</span>
                  )}
                </span>
              ) : active ? (
                <span className="absolute right-1 top-1 rounded-full bg-background p-0.5">
                  <Check className="size-3 text-primary-strong" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
