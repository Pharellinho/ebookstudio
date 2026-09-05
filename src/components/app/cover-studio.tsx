"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { BookCover } from "@/components/app/book-cover";
import {
  COVER_ART_CAP,
  COVER_DIRECTION_MAX,
  COVER_HEIGHT,
  COVER_LAYOUTS,
  COVER_WIDTH,
  type CoverLayout,
} from "@/lib/cover-layouts";
import { cn } from "@/lib/cn";

/* Fonts as the browser knows them, through the next/font variables. */
const DISPLAY_FONT = "var(--font-space-grotesk), sans-serif";
const TEXT_FONT = "var(--font-dm-sans), sans-serif";

const SAVE_DEBOUNCE_MS = 1500;

export type CoverState = {
  artUrl: string | null;
  artCount: number;
  layout: CoverLayout;
  title: string;
  subtitle: string;
  author: string;
};

function friendlyArtError(status: number | null, code?: string): string {
  if (status === 429 && code === "cover_cap") return `This book has used all ${COVER_ART_CAP} illustrations.`;
  if (status === 429) return "Too many illustrations this hour — try again later.";
  if (status === 503 && code === "cover_columns_missing") return "Covers can't be stored yet — the database is missing the cover columns (migration 0010).";
  if (status === 503) return "The image model is unavailable right now.";
  if (status === 502) return "The image model could not draw this one. That attempt still counts; try a different direction.";
  if (status === null) return "Could not reach the server. Check your connection.";
  return "Could not generate the illustration. Try again in a moment.";
}

/** A cover scaled to fit its box, from the same component the PNG uses. */
function ScaledCover({
  state,
  layout,
  accent,
  className,
}: {
  state: CoverState;
  layout: CoverLayout;
  accent: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / COVER_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} className={cn("relative w-full overflow-hidden", className)} style={{ aspectRatio: `${COVER_WIDTH} / ${COVER_HEIGHT}` }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
        <BookCover
          artUrl={state.artUrl}
          title={state.title || "Untitled"}
          subtitle={state.subtitle}
          author={state.author}
          accent={accent}
          layout={layout}
          displayFont={DISPLAY_FONT}
          textFont={TEXT_FONT}
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
        />
      </div>
    </div>
  );
}

/**
 * The Cover tab. Only "Generate artwork" costs anything; layout, title,
 * subtitle and author re-render the cover instantly and save quietly.
 */
export function CoverStudio({
  bookId,
  accent,
  initial,
  onTitleChange,
}: {
  bookId: string;
  accent: string;
  initial: CoverState;
  onTitleChange: (title: string) => void;
}) {
  const [state, setState] = useState<CoverState>(initial);
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [artError, setArtError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const remaining = Math.max(0, COVER_ART_CAP - state.artCount);

  async function patch(fields: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setSaveNote(
          json?.error === "column_missing"
            ? "Cover settings can't be saved yet — the database is missing the cover columns (migration 0010)."
            : "Could not save the cover settings. They stay on screen; try again in a moment.",
        );
        return;
      }
      setSaveNote("Saved");
    } catch {
      setSaveNote("Could not reach the server. Your settings stay on screen.");
    }
  }

  /* Text fields save 1.5 s after the last keystroke. */
  function scheduleTextSave(next: CoverState) {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void patch({
        title: next.title.trim() || "Untitled",
        subtitle: next.subtitle,
        cover_author: next.author,
      });
    }, SAVE_DEBOUNCE_MS);
  }
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  function setField(field: "title" | "subtitle" | "author", value: string) {
    const next = { ...state, [field]: value };
    setState(next);
    setSaveNote(null);
    if (field === "title") onTitleChange(value);
    scheduleTextSave(next);
  }

  function chooseLayout(layout: CoverLayout) {
    // Instant and free: no model, just a re-render and a tiny save.
    setState((prev) => ({ ...prev, layout }));
    setSaveNote(null);
    void patch({ cover_layout: layout });
  }

  async function generate() {
    if (generating || remaining === 0) return;
    setGenerating(true);
    setArtError(null);
    type ArtResponse = { artUrl?: string | null; artCount?: number; error?: string };
    let status: number | null = null;
    let json: ArtResponse | null = null;
    try {
      const res = await fetch(`/api/books/${bookId}/cover/art`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: direction.trim().slice(0, COVER_DIRECTION_MAX) }),
      });
      status = res.status;
      json = (await res.json().catch(() => null)) as ArtResponse | null;
    } catch {
      status = null;
    }
    setGenerating(false);

    // A failed model call still spent a slot: keep the counter honest.
    if (typeof json?.artCount === "number") {
      const count = json.artCount;
      setState((prev) => ({ ...prev, artCount: count }));
    }
    if (status !== 200 || !json?.artUrl) {
      setArtError(friendlyArtError(status, json?.error));
      return;
    }
    const artUrl = json.artUrl;
    setState((prev) => ({ ...prev, artUrl }));
  }

  /* While the model draws, the typographic layout keeps the cover readable. */
  const shownLayout: CoverLayout = generating ? "type" : state.layout;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <ScaledCover
          state={state}
          layout={shownLayout}
          accent={accent}
          className="mx-auto max-w-[26rem] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06),0_24px_48px_-20px_rgba(0,0,0,0.35)]"
        />
        {generating ? (
          <p role="status" className="mt-3 text-center text-xs text-muted-foreground">
            Drawing the illustration — the cover stays usable meanwhile.
          </p>
        ) : null}
      </div>

      <div className="space-y-6">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Illustration
          </p>
          <label htmlFor="cover-direction" className="sr-only">
            Art direction
          </label>
          <input
            id="cover-direction"
            value={direction}
            maxLength={COVER_DIRECTION_MAX}
            onChange={(event) => setDirection(event.target.value)}
            placeholder="Optional direction, e.g. warm evening light, a single terracotta pot"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
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
              {state.artUrl ? "Generate another" : "Generate artwork"}
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {remaining} of {COVER_ART_CAP} left
            </span>
          </div>
          {artError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {artError}
            </p>
          ) : null}
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Layout
          </p>
          <div role="radiogroup" aria-label="Cover layout" className="mt-2 grid grid-cols-4 gap-2">
            {COVER_LAYOUTS.map((layout) => {
              const active = layout.id === state.layout;
              return (
                <button
                  key={layout.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={layout.hint}
                  onClick={() => chooseLayout(layout.id)}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-1 text-left transition-colors",
                    active ? "border-foreground" : "border-border hover:border-primary/50",
                  )}
                >
                  <ScaledCover state={state} layout={layout.id} accent={accent} className="rounded-md" />
                  <span className="mt-1 block truncate px-0.5 text-[11px] font-semibold">
                    {layout.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Text
          </p>
          {(
            [
              { field: "title", label: "Title", max: 200 },
              { field: "subtitle", label: "Subtitle", max: 300 },
              { field: "author", label: "Author", max: 80 },
            ] as const
          ).map((item) => (
            <div key={item.field}>
              <label htmlFor={`cover-${item.field}`} className="text-xs font-semibold text-muted-foreground">
                {item.label}
              </label>
              <input
                id={`cover-${item.field}`}
                value={state[item.field]}
                maxLength={item.max}
                onChange={(event) => setField(item.field, event.target.value)}
                placeholder={item.field === "author" ? "Your name as it should appear" : ""}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
          {saveNote ? (
            <p role={saveNote === "Saved" ? "status" : "alert"} className={cn("text-xs", saveNote === "Saved" ? "text-muted-foreground" : "text-destructive")}>
              {saveNote}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
