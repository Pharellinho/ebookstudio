"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FlipDeck, type DeckControls, type DeckOrientation } from "@/components/book/flip-deck";
import { cn } from "@/lib/cn";

/* An 8.5 × 11 page, laid out at a fixed size and scaled to the deck like
   the ebook sheets: 460 wide, 595 tall. */
const SHEET = { width: 460, height: 595 };

const SETTINGS = {
  width: SHEET.width,
  height: SHEET.height,
  minWidth: 250,
  maxWidth: SHEET.width,
  minHeight: Math.round((250 * SHEET.height) / SHEET.width),
  maxHeight: SHEET.height,
  usePortrait: true,
  showCover: true,
} as const;

export type ColoringReaderPage = { position: number; scene: string; url: string | null };

/**
 * The coloring book turned page by page: cover, title page, the "belongs
 * to" page, then every picture. No measuring: each picture is a page.
 */
export function ColoringReader({
  title,
  subtitle,
  author,
  coverUrl,
  pages,
  blankVersos = false,
}: {
  title: string;
  subtitle: string | null;
  author: string;
  coverUrl: string | null;
  pages: ColoringReaderPage[];
  blankVersos?: boolean;
}) {
  const deck = useRef<DeckControls | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  /* The index is remembered with the deck it belongs to: a rebuilt deck
     (a different page count) starts at its cover again, without an effect. */
  const [position, setPosition] = useState<{ total: number; index: number }>({ total: 0, index: 0 });
  const [orientation, setOrientation] = useState<DeckOrientation>("landscape");

  const sheets = useMemo<ReactNode[]>(() => {
    const out: ReactNode[] = [
      <Scaled key="cover">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={`Cover of ${title}`} draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-end bg-primary p-8 text-on-primary">
            <p className="font-display text-[2rem] font-extrabold leading-tight">{title}</p>
            {author ? <p className="mt-3 text-xs uppercase tracking-[0.2em] opacity-80">{author}</p> : null}
          </div>
        )}
      </Scaled>,
      <Scaled key="blank">
        <div className="h-full" />
      </Scaled>,
      <Scaled key="title">
        <div className="flex h-full flex-col items-center justify-center px-10 text-center">
          <p className="font-display text-[1.9rem] font-extrabold leading-tight text-foreground">{title}</p>
          {subtitle ? <p className="mt-4 text-sm text-foreground/60">{subtitle}</p> : null}
          {author ? <p className="mt-16 text-[0.7rem] uppercase tracking-[0.25em] text-foreground/50">{author}</p> : null}
        </div>
      </Scaled>,
      <Scaled key="belongs">
        <div className="flex h-full flex-col items-center justify-center px-10 text-center">
          <p className="font-display text-xl font-bold text-foreground">This book belongs to</p>
          <span className="mt-8 block w-2/3 border-b border-foreground" aria-hidden="true" />
          <p className="mt-10 text-xs text-foreground/50">Colour every page your way. There is no wrong colour.</p>
        </div>
      </Scaled>,
    ];
    for (const page of pages) {
      out.push(
        <Scaled key={`page-${page.position}`}>
          {page.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.url}
              alt={`Page ${page.position + 1}: ${page.scene}`}
              draggable={false}
              className="h-full w-full object-contain p-5"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-foreground/40">Not drawn yet</div>
          )}
        </Scaled>,
      );
      if (blankVersos) {
        out.push(
          <Scaled key={`verso-${page.position}`}>
            <div className="h-full" />
          </Scaled>,
        );
      }
    }
    return out;
  }, [title, subtitle, author, coverUrl, pages, blankVersos]);

  const total = sheets.length;
  const index = position.total === total ? position.index : 0;
  const setIndex = (next: number) => setPosition({ total, index: next });

  const spread = orientation === "landscape" && index > 0 && index + 1 < total;
  const label = spread ? `${index + 1}–${index + 2} of ${total}` : `${index + 1} of ${total}`;
  const reached = Math.min(total, index + (spread ? 2 : 1));

  return (
    <div className="flex flex-col items-center">
      <div
        ref={frame}
        className="relative w-full overflow-clip [overflow-clip-margin:20px] py-3"
        role="group"
        aria-roledescription="book"
        aria-label={`${title}, page ${index + 1} of ${total}`}
      >
        <FlipDeck
          key={total}
          pages={sheets}
          controls={deck}
          onIndexChange={setIndex}
          onInteract={() => {}}
          settings={SETTINGS}
          onLayout={({ pageWidth, orientation: next }) => {
            frame.current?.style.setProperty("--sheet-scale", String(pageWidth / SHEET.width));
            setOrientation(next);
          }}
        />
      </div>
      <div className="mt-6 flex w-full max-w-[24rem] items-center gap-4">
        <Round label="Previous page" disabled={index === 0} onClick={() => deck.current?.prev()}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Round>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.round((reached / total) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{label}</span>
        </div>
        <Round label="Next page" disabled={reached >= total} onClick={() => deck.current?.next()}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Round>
      </div>
    </div>
  );
}

function Scaled({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-white shadow-2xl">
      <div
        style={{
          width: SHEET.width,
          height: SHEET.height,
          transform: "scale(var(--sheet-scale, 1))",
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-linear-to-r from-black/12 via-black/4 to-transparent"
      />
    </div>
  );
}

function Round({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all hover:border-primary hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
