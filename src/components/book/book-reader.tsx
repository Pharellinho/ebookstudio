"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/paginate";
import { FlipDeck, type DeckControls, type DeckOrientation } from "@/components/book/flip-deck";
import {
  LayoutMeasurer,
  buildLayout,
  chapterBlocks,
  splitOversizeBlocks,
  type BookLayout,
  type ChapterMeasure,
  type ChapterSource,
  type SheetSpec,
} from "@/components/book/book-layout";
import {
  BlankSheet,
  BodySheet,
  ChapterSheet,
  ContentsSheet,
  CoverSheet,
  SHEET,
  TitleSheet,
} from "@/components/book/book-sheets";

export type ReaderControls = {
  /** Turn to the first sheet of a chapter (0-based). */
  goToChapter: (index: number) => void;
};

/* The studio deck: a 2:3 page, a two-page spread when the column allows
   it, a single page below minWidth * 2. The cover stands alone. */
const READER_SETTINGS = {
  width: SHEET.width,
  height: SHEET.height,
  minWidth: 250,
  maxWidth: SHEET.width,
  minHeight: Math.round((250 * SHEET.height) / SHEET.width),
  maxHeight: SHEET.height,
  usePortrait: true,
  showCover: true,
} as const;

/**
 * The reading view: the author's own book, cover to last page, turned like
 * the sample books on the landing. Chapters are measured once (see
 * book-layout.tsx), cut into fixed-size sheets, and scaled as a whole to
 * whatever page size the deck settles on.
 */
export function BookReader({
  bookTitle,
  subtitle,
  author,
  coverUrl,
  chapters,
  design,
  theme,
  controlsRef,
  onChapterChange,
}: {
  bookTitle: string;
  subtitle: string | null;
  author: string;
  coverUrl: string | null;
  chapters: ChapterSource[];
  design: BookDesign;
  theme: BookTheme;
  controlsRef?: RefObject<ReaderControls | null>;
  /** The chapter the reader is looking at, whenever it changes. */
  onChapterChange?: (index: number) => void;
}) {
  /* Pass 1 measures the blocks as split; while some block cannot fit any
     page and can be broken up (a long table), another pass measures the
     smaller pieces. */
  const [blocksByChapter, setBlocksByChapter] = useState<Block[][]>(() => chapterBlocks(chapters));
  const [pass, setPass] = useState(1);
  const [layout, setLayout] = useState<BookLayout | null>(null);
  /* The chapters the current layout was built from. The parent may hand a
     new array on every render; only a change in content starts over. */
  const [source, setSource] = useState(chapters);
  const [version, setVersion] = useState(0);

  /* Any change to the text or the look starts over. */
  const inputsKey = useMemo(
    () => JSON.stringify([chapters.map((c) => [c.id, c.title, c.markdown]), design, theme.id, bookTitle]),
    [chapters, design, theme.id, bookTitle],
  );
  const lastInputs = useRef(inputsKey);
  useEffect(() => {
    if (lastInputs.current === inputsKey) return;
    lastInputs.current = inputsKey;
    setSource(chapters);
    setBlocksByChapter(chapterBlocks(chapters));
    setPass(1);
    setLayout(null);
  }, [inputsKey, chapters]);

  /* Each pass cuts the tables that still do not fit into smaller pieces:
     eight rows, then four, two, one. Four passes at most. */
  function handleMeasured(measures: ChapterMeasure[]) {
    if (pass < 4) {
      const split = splitOversizeBlocks(blocksByChapter, measures, Math.max(1, 8 >> (pass - 1)));
      if (split) {
        setBlocksByChapter(split);
        setPass(pass + 1);
        return;
      }
    }
    setLayout(buildLayout(blocksByChapter, measures));
    setVersion((v) => v + 1);
    setIndex(0);
  }

  const deck = useRef<DeckControls | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [orientation, setOrientation] = useState<DeckOrientation>("landscape");
  const total = layout?.sheets.length ?? 0;

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      goToChapter: (chapter) => {
        const target = layout?.chapterStart[chapter];
        if (target != null) deck.current?.goTo(target);
      },
    };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, layout]);

  const spread = orientation === "landscape" && index > 0 && index + 1 < total;

  /* Which chapter the reader is in: on a spread, the right-hand page, since
     a chapter opens on the right and its predecessor ends on the left. */
  const chapterAt = useRef<number | null>(null);
  useEffect(() => {
    if (!layout || !onChapterChange) return;
    const lookAt = spread ? index + 1 : index;
    let chapter: number | null = null;
    layout.chapterStart.forEach((start, position) => {
      if (lookAt >= start) chapter = position;
    });
    if (chapter != null && chapter !== chapterAt.current) {
      chapterAt.current = chapter;
      onChapterChange(chapter);
    }
  }, [index, spread, layout, onChapterChange]);

  /* The sheets are built once per layout: flipping never re-renders them. */
  const pages = useMemo<ReactNode[]>(() => {
    if (!layout) return [];
    return layout.sheets.map((sheet, position) => (
      <ScaledSheet key={position}>
        <Sheet
          sheet={sheet}
          chapters={source}
          layout={layout}
          bookTitle={bookTitle}
          subtitle={subtitle}
          author={author}
          coverUrl={coverUrl}
          design={design}
          theme={theme}
        />
      </ScaledSheet>
    ));
  }, [layout, source, bookTitle, subtitle, author, coverUrl, design, theme]);

  const label = spread ? `${index + 1}–${index + 2} of ${total}` : `${index + 1} of ${total}`;
  const reached = Math.min(total, index + (spread ? 2 : 1));
  const progress = total > 0 ? reached / total : 0;

  return (
    <div className="flex flex-col items-center">
      {layout == null ? (
        <>
          <LayoutMeasurer
            key={pass}
            chapters={source}
            blocksByChapter={blocksByChapter}
            design={design}
            theme={theme}
            bookTitle={bookTitle}
            onMeasured={handleMeasured}
          />
          <div
            role="status"
            className="flex aspect-[3/2] w-full max-w-[52rem] flex-col items-center justify-center rounded-lg bg-surface text-sm text-muted-foreground"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <p className="mt-3">Laying out your book…</p>
          </div>
        </>
      ) : (
        <div
          ref={frame}
          /* `overflow: clip` (not hidden): a page mid-turn swings past the
             deck's box, and in a scrolling container that overshoot grew the
             scroll height on every frame — the whole app shook with each
             turn. Clip is not a scroll container, so the overshoot can never
             move anything; the clip margin lets the corner show a little. */
          className="relative w-full overflow-clip [overflow-clip-margin:20px] py-3"
          role="group"
          aria-roledescription="book"
          aria-label={`${bookTitle}, page ${index + 1} of ${total}`}
        >
          <FlipDeck
            key={version}
            pages={pages}
            controls={deck}
            onIndexChange={setIndex}
            onInteract={() => {}}
            settings={READER_SETTINGS}
            onLayout={({ pageWidth, orientation: next }) => {
              frame.current?.style.setProperty("--sheet-scale", String(pageWidth / SHEET.width));
              setOrientation(next);
            }}
          />
        </div>
      )}

      <div className="mt-6 flex w-full max-w-[24rem] items-center gap-4">
        <RoundButton label="Previous page" disabled={!layout || index === 0} onClick={() => deck.current?.prev()}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </RoundButton>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {layout ? label : "…"}
          </span>
        </div>
        <RoundButton label="Next page" disabled={!layout || reached >= total} onClick={() => deck.current?.next()}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </RoundButton>
      </div>
    </div>
  );
}

/**
 * A page of the deck: StPageFlip sizes the outer box, the sheet inside is
 * laid out at its fixed size and scaled to fit. The scale is a CSS variable
 * set on the frame, so a resize touches one style, not a hundred sheets.
 */
function ScaledSheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#fdfbf7] shadow-2xl">
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

function Sheet({
  sheet,
  chapters,
  layout,
  bookTitle,
  subtitle,
  author,
  coverUrl,
  design,
  theme,
}: {
  sheet: SheetSpec;
  chapters: ChapterSource[];
  layout: BookLayout;
  bookTitle: string;
  subtitle: string | null;
  author: string;
  coverUrl: string | null;
  design: BookDesign;
  theme: BookTheme;
}) {
  switch (sheet.kind) {
    case "cover":
      return (
        <CoverSheet url={coverUrl} title={bookTitle} subtitle={subtitle} author={author} design={design} theme={theme} />
      );
    case "blank":
      return <BlankSheet design={design} theme={theme} />;
    case "title":
      return <TitleSheet title={bookTitle} subtitle={subtitle} author={author} design={design} theme={theme} />;
    case "contents":
      return (
        <ContentsSheet
          entries={chapters.map((chapter, position) => ({
            title: chapter.title,
            folio: layout.chapterFolio[position] ?? 1,
          }))}
          design={design}
          theme={theme}
        />
      );
    case "chapter":
      return (
        <ChapterSheet
          design={design}
          theme={theme}
          number={sheet.chapter + 1}
          title={chapters[sheet.chapter]?.title ?? ""}
          blocks={sheet.blocks}
          folio={sheet.folio}
        />
      );
    case "body":
      return (
        <BodySheet design={design} theme={theme} bookTitle={bookTitle} blocks={sheet.blocks} folio={sheet.folio} />
      );
  }
}

function RoundButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
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
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:border-primary hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
