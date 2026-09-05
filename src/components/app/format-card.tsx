"use client";

import type { EbookFormat } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * One ebook format as a selectable card: name, size, and a nudge toward the
 * format a first-time author should start with. Lifted from the retired
 * create wizard. It deliberately shows no credit cost: there is no balance,
 * no deduction and no billing yet, so a cost on screen would be a promise.
 */
export function FormatCard({
  format,
  selected,
  disabled = false,
  onSelect,
}: {
  format: EbookFormat;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const inert = disabled && !selected;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={inert}
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-foreground bg-primary/15 shadow-sm"
          : "border-border bg-background hover:border-primary/50",
        inert ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <p className="font-display text-sm font-semibold">{format.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {format.pages} pages · {format.chapters} chapters
      </p>
      {format.slug === "lead-magnet" ? (
        <p className="mt-2 text-xs font-semibold text-primary-strong">
          Recommended to start
        </p>
      ) : null}
    </button>
  );
}
