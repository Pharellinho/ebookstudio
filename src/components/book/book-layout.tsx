"use client";

import { useEffect, useRef } from "react";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";
import {
  oversizeBlocks,
  packPages,
  splitBlocks,
  splitOversize,
  type Block,
  type MeasuredBlock,
  type PageCapacities,
} from "@/lib/paginate";
import { BookBlocks, Opener, RunningHead, bookVars } from "@/components/book/book-page";
import { OPENER_GAP, SHEET, SHEET_BLEED, SHEET_CONTENT } from "@/components/book/book-sheets";

/**
 * From chapters to sheets.
 *
 * The pure half (`src/lib/paginate.ts`) cuts markdown into blocks and packs
 * measured blocks into pages. This file is the browser half: it renders the
 * blocks of every chapter once, invisibly, in a column exactly as wide as a
 * sheet's content, reads where each block starts and ends, and hands those
 * numbers to the packer. Measuring in the DOM is the only way to know how
 * tall a paragraph is in the real typeface at the real width; a PDF
 * exporter can feed the same packer with heights from its own layout engine.
 */

export type ChapterSource = { id: string; title: string; markdown: string };

export type SheetSpec =
  | { kind: "cover" }
  | { kind: "blank" }
  | { kind: "title" }
  | { kind: "contents" }
  | { kind: "chapter"; chapter: number; blocks: Block[]; folio: number }
  | { kind: "body"; chapter: number; blocks: Block[]; folio: number };

export type BookLayout = {
  sheets: SheetSpec[];
  /** Deck index of each chapter's first sheet. */
  chapterStart: number[];
  /** Folio printed on each chapter's first sheet, for the contents page. */
  chapterFolio: number[];
};

/** What the measurer reads for one chapter. */
export type ChapterMeasure = {
  /** Height of the opener, gap to the first block included. */
  opener: number;
  /** Height of the running head, its bottom margin included. */
  head: number;
  blocks: MeasuredBlock[];
};

export function capacitiesFor(measure: ChapterMeasure): PageCapacities {
  return {
    first: Math.max(0, SHEET_CONTENT.height - measure.opener),
    rest: Math.max(0, SHEET_CONTENT.height - measure.head),
  };
}

/** Blocks for every chapter, from its markdown. Pure. */
export function chapterBlocks(chapters: ChapterSource[]): Block[][] {
  return chapters.map((chapter) => splitBlocks(chapter.markdown));
}

/**
 * Replaces blocks that cannot fit any page with smaller ones, when the kind
 * allows it. Returns null when nothing changed, so the caller knows whether
 * a second measurement is worth it.
 */
export function splitOversizeBlocks(
  blocksByChapter: Block[][],
  measures: ChapterMeasure[],
  rowsPerPiece = 8,
): Block[][] | null {
  let changed = false;
  const next = blocksByChapter.map((blocks, chapter) => {
    const measure = measures[chapter];
    if (!measure) return blocks;
    const tooTall = new Set(oversizeBlocks(measure.blocks, capacitiesFor(measure)));
    if (tooTall.size === 0) return blocks;
    return blocks.flatMap((block, index) => {
      if (!tooTall.has(index)) return [block];
      const pieces = splitOversize(block, rowsPerPiece);
      if (pieces.length > 1) changed = true;
      return pieces;
    });
  });
  return changed ? next : null;
}

/** Cover, blank, title, contents, then every chapter cut into sheets. Pure. */
export function buildLayout(blocksByChapter: Block[][], measures: ChapterMeasure[]): BookLayout {
  const sheets: SheetSpec[] = [{ kind: "cover" }, { kind: "blank" }, { kind: "title" }, { kind: "contents" }];
  const chapterStart: number[] = [];
  const chapterFolio: number[] = [];
  let folio = 1;

  blocksByChapter.forEach((blocks, chapter) => {
    const measure = measures[chapter];
    const pages = measure ? packPages(measure.blocks, capacitiesFor(measure)) : [];
    chapterStart.push(sheets.length);
    chapterFolio.push(folio);
    if (pages.length === 0) {
      sheets.push({ kind: "chapter", chapter, blocks: [], folio });
      folio += 1;
      return;
    }
    pages.forEach(([from, to], page) => {
      sheets.push({
        kind: page === 0 ? "chapter" : "body",
        chapter,
        blocks: blocks.slice(from, to + 1),
        folio,
      });
      folio += 1;
    });
  });

  return { sheets, chapterStart, chapterFolio };
}

/**
 * Renders every chapter's opener, running head and blocks in an invisible
 * column the width of a sheet's content, waits for the fonts, measures, and
 * reports once. Mount it with a `key` that changes when the inputs do.
 */
export function LayoutMeasurer({
  chapters,
  blocksByChapter,
  design,
  theme,
  bookTitle,
  onMeasured,
}: {
  chapters: ChapterSource[];
  blocksByChapter: Block[][];
  design: BookDesign;
  theme: BookTheme;
  bookTitle: string;
  onMeasured: (measures: ChapterMeasure[]) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const report = useRef(onMeasured);
  useEffect(() => {
    report.current = onMeasured;
  });

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const host = root.current;
      if (!host || cancelled) return;
      const measures: ChapterMeasure[] = Array.from(
        host.querySelectorAll<HTMLElement>("[data-measure-chapter]"),
      ).map((column) => {
        const opener = column.querySelector<HTMLElement>("[data-measure-opener]");
        const head = column.querySelector<HTMLElement>("[data-measure-head]");
        const body = column.querySelector<HTMLElement>("[data-measure-body]");
        const blocks: MeasuredBlock[] = body
          ? Array.from(body.querySelectorAll<HTMLElement>("[data-block]")).map((el) => ({
              kind: (el.dataset.kind ?? "p") as MeasuredBlock["kind"],
              top: el.offsetTop,
              bottom: el.offsetTop + el.offsetHeight,
            }))
          : [];
        return {
          /* The opener column carries the sheet's top padding so a bleeding
             band (negative top margin) measures what it really costs below
             the content's top edge; a plain opener measures its own height. */
          opener: Math.max(0, (opener?.offsetHeight ?? SHEET.padTop) - SHEET.padTop) + OPENER_GAP,
          head: head?.offsetHeight ?? 0,
          blocks,
        };
      });
      report.current(measures);
    };

    /* Fonts that are still loading would make every height wrong. */
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts?.ready) {
      fonts.ready.then(measure, measure);
    } else {
      measure();
    }
    return () => {
      cancelled = true;
    };
  }, [blocksByChapter, design, theme, bookTitle]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      lang="en"
      style={{ ...bookVars(theme), width: SHEET_CONTENT.width }}
      className={cn(
        "book-page pointer-events-none absolute left-[-20000px] top-0 text-foreground/85",
        design.typeface === "serif" ? "font-book" : "font-sans",
      )}
    >
      {chapters.map((chapter, index) => (
        <div key={chapter.id} data-measure-chapter="" className="relative pt-px">
          <div data-measure-opener="" style={{ paddingTop: SHEET.padTop }}>
            <Opener design={design} theme={theme} number={index + 1} title={chapter.title} bleed={SHEET_BLEED} fixed />
          </div>
          {/* The running head's bottom margin is part of what it costs a page. */}
          <div data-measure-head="" className="flex flex-col">
            <RunningHead design={design} accent={theme.accent} bookTitle={bookTitle} />
          </div>
          <div data-measure-body="" className="relative">
            <BookBlocks
              blocks={blocksByChapter[index] ?? []}
              design={design}
              theme={theme}
              dropCap={design.dropCap}
              className="[&>:first-child>:first-child]:mt-0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
