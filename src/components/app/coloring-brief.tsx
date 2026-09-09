"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Palette } from "lucide-react";
import {
  AGE_BANDS,
  DEFAULT_COLORING_PAGES,
  LINE_STYLES,
  MAX_COLORING_PAGES,
  MIN_COLORING_PAGES,
  PAGE_SIZES,
  THEME_MAX,
  type AgeBand,
  type ColoringSettings,
  type LineStyle,
} from "@/lib/coloring";
import { COVER_AUTHOR_MAX } from "@/lib/cover-rules";
import { cn } from "@/lib/cn";

const EXAMPLES = [
  "Farm animals and their babies",
  "Under the sea: fish, turtles and a friendly octopus",
  "Dinosaurs in a jungle",
  "Mandalas made of flowers",
];

const ERROR_TEXT: Record<string, string> = {
  upgrade_required: "The coloring studio comes with a plan. Upgrade to plan and draw a coloring book.",
  openai_not_configured: "The planning model isn't connected on this server yet. This is on our side.",
  rate_limited: "You've planned a lot of books this hour. Give it a little while.",
  plan_failed: "The plan could not be made. Try again, or change the theme a little.",
  invalid_settings: "Check the theme and the number of pages.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  forbidden: "This request was blocked. Reload the page and try again.",
};

function friendly(code: string): string {
  return ERROR_TEXT[code] ?? "Something went wrong on our side. Try again in a moment.";
}

type Scene = { scene: string; detail: string };

/**
 * The brief of a coloring book: theme, age, pages, line style, title and
 * author. One click plans the pages with a single text call, saves the book
 * with its plan, and opens the plan to edit.
 */
export function ColoringBrief({ defaultAuthor = "" }: { defaultAuthor?: string }) {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("6-9");
  const [lineStyle, setLineStyle] = useState<LineStyle>("simple");
  const [pageCount, setPageCount] = useState(DEFAULT_COLORING_PAGES);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(defaultAuthor.slice(0, COVER_AUTHOR_MAX));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const settings: ColoringSettings = {
    kind: "coloring",
    theme: theme.trim(),
    ageBand,
    lineStyle,
    pageSize: "letter",
    pageCount,
  };

  async function plan() {
    if (busy) return;
    if (settings.theme.length < 3) {
      setError("Tell us the theme in a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Planning the pages…");
    try {
      const planRes = await fetch("/api/coloring/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, title: title.trim() || undefined }),
      });
      const planJson = (await planRes.json().catch(() => null)) as {
        plan?: { title: string; subtitle: string; scenes: Scene[] };
        error?: string;
      } | null;
      if (!planRes.ok || !planJson?.plan) throw new Error(planJson?.error ?? "plan_failed");
      const { plan: made } = planJson;

      setStatus("Saving your book…");
      const finalTitle = title.trim() || made.title || settings.theme;
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: `A coloring book about ${settings.theme}`,
          formatSlug: "coloring-book",
          title: finalTitle,
          subtitle: made.subtitle,
          author: author.trim().slice(0, COVER_AUTHOR_MAX),
          settings,
          outline: {
            title: finalTitle,
            subtitle: made.subtitle,
            chapters: made.scenes.map((scene) => ({ title: scene.scene, summary: scene.detail })),
          },
        }),
      });
      const createJson = (await createRes.json().catch(() => null)) as { book?: { id: string }; error?: string } | null;
      if (!createRes.ok || !createJson?.book?.id) throw new Error(createJson?.error ?? "create_failed");
      router.push(`/coloring/${createJson.book.id}`);
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : ""));
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-background shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <p className="font-display text-sm">
            <span className="font-bold">Coloring book</span>{" "}
            <span className="font-medium text-muted-foreground">from a theme to printable pages</span>
          </p>
          {status ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              {status}
            </p>
          ) : null}
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <p className="font-display text-lg font-bold">What is the book about?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              One theme, one age, a number of pages. We plan one scene per page, you adjust the list, then
              every page is drawn as clean black lines on white, ready to print.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-primary/40 bg-[#f7f5f1]/40 p-3">
            <textarea
              rows={2}
              value={theme}
              maxLength={THEME_MAX}
              onChange={(event) => setTheme(event.target.value)}
              placeholder='e.g. "Farm animals and their babies"'
              className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setTheme(example)}
                className="cursor-pointer rounded-full bg-muted px-3 py-1.5 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wide">Who colours it</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {AGE_BANDS.map((band) => (
                  <button
                    key={band.id}
                    type="button"
                    aria-pressed={ageBand === band.id}
                    onClick={() => setAgeBand(band.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 px-3 py-2 text-left transition-colors",
                      ageBand === band.id ? "border-foreground bg-primary/15" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{band.label}</span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">{band.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wide">Line style</legend>
              <div className="mt-2 grid gap-2">
                {LINE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    aria-pressed={lineStyle === style.id}
                    onClick={() => setLineStyle(style.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 px-3 py-2 text-left transition-colors",
                      lineStyle === style.id ? "border-foreground bg-primary/15" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{style.label}</span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">{style.hint}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label htmlFor="coloring-pages" className="text-xs font-bold uppercase tracking-wide">
                  Pages · {pageCount}
                </label>
                <input
                  id="coloring-pages"
                  type="range"
                  min={MIN_COLORING_PAGES}
                  max={MAX_COLORING_PAGES}
                  step={2}
                  value={pageCount}
                  onChange={(event) => setPageCount(Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--color-primary)]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {PAGE_SIZES[0].label}. KDP prints from 24 pages.
                </p>
              </div>
            </fieldset>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coloring-title" className="text-xs font-bold uppercase tracking-wide">
                Title <span className="font-normal normal-case text-muted-foreground">(optional, we can suggest one)</span>
              </label>
              <input
                id="coloring-title"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Leave empty for a suggestion"
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="coloring-author" className="text-xs font-bold uppercase tracking-wide">
                Author name on the cover
              </label>
              <input
                id="coloring-author"
                value={author}
                maxLength={COVER_AUTHOR_MAX}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Your name or pen name"
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void plan()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Palette className="size-4" aria-hidden="true" />}
              Plan my pages
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
