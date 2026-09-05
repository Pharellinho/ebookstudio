"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { BookPage } from "@/components/book/book-page";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";

function friendlyError(status: number | null): string {
  if (status === 503) return "Themes can't be saved yet — the database is missing a column (migration 0009).";
  if (status === 404) return "This book no longer exists.";
  if (status === null) return "Could not reach the server. Check your connection.";
  return "Could not save the theme. Try again in a moment.";
}

/** A short, honest slice of the chapter for the thumbnails. */
function excerpt(markdown: string): string {
  const cut = markdown.slice(0, 700);
  const lastBreak = cut.lastIndexOf("\n\n");
  return lastBreak > 200 ? cut.slice(0, lastBreak) : cut;
}

/**
 * Three real thumbnails of the current chapter, one per theme, rendered by
 * the same BookPage the preview uses — so what you pick is what you get.
 */
export function ThemePicker({
  bookId,
  design,
  themes,
  themeId,
  markdown,
  chapterNumber,
  chapterTitle,
  bookTitle,
  onChange,
}: {
  bookId: string;
  design: BookDesign;
  themes: BookTheme[];
  themeId: string;
  markdown: string;
  chapterNumber: number;
  chapterTitle: string;
  bookTitle: string;
  onChange: (themeId: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sample = excerpt(markdown);

  async function choose(theme: BookTheme) {
    if (saving || theme.id === themeId) return;
    setSaving(theme.id);
    setError(null);
    let status: number | null = null;
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.id }),
      });
      status = res.status;
    } catch {
      status = null;
    }
    setSaving(null);
    if (status !== 200) {
      setError(friendlyError(status));
      return;
    }
    onChange(theme.id);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Interior theme
      </p>
      <div role="radiogroup" aria-label="Interior theme" className="mt-3 grid gap-3 sm:grid-cols-3">
        {themes.map((theme) => {
          const active = theme.id === themeId;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving != null}
              onClick={() => void choose(theme)}
              className={cn(
                "group cursor-pointer rounded-xl border-2 p-1.5 text-left transition-colors disabled:cursor-wait",
                active ? "border-foreground" : "border-border hover:border-primary/50",
              )}
            >
              <div className="relative h-44 overflow-hidden rounded-lg bg-[#fdfbf7]">
                {/* The real page, scaled: 44rem wide at 0.3 fits the card. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-0 w-[44rem] origin-top-left scale-[0.3]"
                >
                  <BookPage
                    markdown={sample}
                    design={design}
                    theme={theme}
                    chapterNumber={chapterNumber}
                    chapterTitle={chapterTitle}
                    bookTitle={bookTitle}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-1.5 pb-1 pt-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                  {theme.name}
                </span>
                {saving === theme.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                ) : active ? (
                  <Check className="size-4 text-primary-strong" aria-hidden="true" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
