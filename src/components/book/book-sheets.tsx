import type { ReactNode } from "react";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/paginate";
import {
  BookBlocks,
  Opener,
  RunningHead,
  Rule,
  WEIGHT,
  bookVars,
  isLight,
  type OpenerBleed,
} from "@/components/book/book-page";

/**
 * The fixed-size sheets of the reading view.
 *
 * Every sheet is laid out at exactly SHEET.width × SHEET.height CSS pixels,
 * whatever the screen, and scaled as a whole to the size the flip deck gives
 * a page. That is what lets the pagination measure once and stay right: the
 * text never reflows, it only gets bigger or smaller.
 */
export const SHEET = {
  width: 460,
  height: 690,
  padX: 40,
  padTop: 44,
  /** Bottom padding, folio included. */
  padBottom: 44,
} as const;

/** Room for content between the paddings. */
export const SHEET_CONTENT = {
  width: SHEET.width - SHEET.padX * 2,
  height: SHEET.height - SHEET.padTop - SHEET.padBottom,
} as const;

/** Space between a chapter opener and its first block (`mt-10`). */
export const OPENER_GAP = 40;

/** The opener's bleed on a sheet: the sheet's own padding, no responsive variants. */
export const SHEET_BLEED: OpenerBleed = {
  x: "-mx-10 px-10",
  top: "-mt-11",
  padTop: "pt-11",
  padTopCompact: "pt-7",
};

function typeface(design: BookDesign) {
  return design.typeface === "serif" ? "font-book" : "font-sans";
}

/** The paper: fixed size, padding, folio pinned to the foot. */
export function SheetFrame({
  design,
  theme,
  folio,
  children,
  className,
}: {
  design: BookDesign;
  theme: BookTheme;
  folio?: number | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      lang="en"
      style={{
        ...bookVars(theme),
        width: SHEET.width,
        height: SHEET.height,
        paddingLeft: SHEET.padX,
        paddingRight: SHEET.padX,
        paddingTop: SHEET.padTop,
        paddingBottom: SHEET.padBottom,
      }}
      className={cn(
        "book-page relative flex flex-col overflow-hidden bg-[#fdfbf7] text-foreground/85",
        typeface(design),
        className,
      )}
    >
      {/* No overflow clip on this box: the banner opener bleeds past it on
          purpose. The sheets clip their block area themselves, so nothing
          can run under the folio. */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {folio != null ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[0.68rem] tabular-nums tracking-[0.2em] text-foreground/35">
          {folio}
        </p>
      ) : null}
    </div>
  );
}

/** The first sheet of a chapter: opener, then the blocks that fit under it. */
export function ChapterSheet({
  design,
  theme,
  number,
  title,
  blocks,
  folio,
}: {
  design: BookDesign;
  theme: BookTheme;
  number: number;
  title: string;
  blocks: Block[];
  folio: number;
}) {
  return (
    <SheetFrame design={design} theme={theme} folio={folio}>
      <div className="shrink-0">
        <Opener design={design} theme={theme} number={number} title={title} bleed={SHEET_BLEED} fixed />
      </div>
      <div className="mt-10 min-h-0 flex-1 overflow-hidden">
        <BookBlocks blocks={blocks} design={design} theme={theme} dropCap={design.dropCap} />
      </div>
    </SheetFrame>
  );
}

/** A continuation sheet: running head, then blocks. */
export function BodySheet({
  design,
  theme,
  bookTitle,
  blocks,
  folio,
}: {
  design: BookDesign;
  theme: BookTheme;
  bookTitle: string;
  blocks: Block[];
  folio: number;
}) {
  return (
    <SheetFrame design={design} theme={theme} folio={folio}>
      <div className="shrink-0">
        <RunningHead design={design} accent={theme.accent} bookTitle={bookTitle} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <BookBlocks blocks={blocks} design={design} theme={theme} />
      </div>
    </SheetFrame>
  );
}

/** The cover: the chosen picture, or the title set on the accent when there is none yet. */
export function CoverSheet({
  url,
  title,
  subtitle,
  author,
  design,
  theme,
}: {
  url: string | null;
  title: string;
  subtitle: string | null;
  author: string;
  design: BookDesign;
  theme: BookTheme;
}) {
  if (url) {
    return (
      <div style={{ width: SHEET.width, height: SHEET.height }} className="relative overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Cover of ${title}`} draggable={false} className="h-full w-full object-cover" />
      </div>
    );
  }
  const onAccent = isLight(theme.accent) ? "text-foreground" : "text-white";
  return (
    <div
      lang="en"
      style={{ width: SHEET.width, height: SHEET.height, backgroundColor: theme.accent, padding: SHEET.padX }}
      className={cn("flex flex-col overflow-hidden", typeface(design), onAccent)}
    >
      <p className={cn("mt-16 font-display text-[2.6rem] leading-[1.05] tracking-tight", WEIGHT[theme.headingWeight])}>{title}</p>
      {subtitle ? <p className="mt-6 text-[1.05rem] leading-snug opacity-80">{subtitle}</p> : null}
      {author ? <p className="mt-auto text-[0.8rem] uppercase tracking-[0.2em] opacity-75">{author}</p> : null}
    </div>
  );
}

/** The inside of the cover. Real books leave it blank; so does this one. */
export function BlankSheet({ design, theme }: { design: BookDesign; theme: BookTheme }) {
  return (
    <SheetFrame design={design} theme={theme}>
      <span className="sr-only">This page is intentionally blank.</span>
    </SheetFrame>
  );
}

/** Title page: title, rule, subtitle, author at the foot. */
export function TitleSheet({
  title,
  subtitle,
  author,
  design,
  theme,
}: {
  title: string;
  subtitle: string | null;
  author: string;
  design: BookDesign;
  theme: BookTheme;
}) {
  return (
    <SheetFrame design={design} theme={theme}>
      <div className="flex h-full flex-col items-center pt-24 text-center">
        <p className={cn("font-display text-[2rem] leading-[1.1] tracking-tight text-foreground", WEIGHT[theme.headingWeight])}>
          {title}
        </p>
        <Rule theme={theme} className="mx-auto mt-7" />
        {subtitle ? <p className="mt-6 max-w-[18rem] text-[0.98rem] leading-relaxed text-foreground/70">{subtitle}</p> : null}
        {author ? (
          <p className="mt-auto pb-2 text-[0.72rem] uppercase tracking-[0.24em]" style={{ color: theme.accent }}>
            {author}
          </p>
        ) : null}
      </div>
    </SheetFrame>
  );
}

export type ContentsEntry = { title: string; folio: number };

/** The table of contents, with the folios the pagination settled on. */
export function ContentsSheet({
  entries,
  design,
  theme,
}: {
  entries: ContentsEntry[];
  design: BookDesign;
  theme: BookTheme;
}) {
  return (
    <SheetFrame design={design} theme={theme}>
      <p className={cn("text-center font-display text-[1.25rem] tracking-tight text-foreground", WEIGHT[theme.headingWeight])}>
        Contents
      </p>
      <Rule theme={theme} className="mx-auto mt-4" />
      <ol className="mt-8 space-y-2.5 text-[0.95rem]">
        {entries.map((entry, index) => (
          <li key={`${entry.title}-${index}`} className="flex items-baseline gap-2">
            <span className="w-6 shrink-0 tabular-nums" style={{ color: theme.accent }}>
              {index + 1}
            </span>
            <span className="min-w-0 truncate">{entry.title}</span>
            <span aria-hidden="true" className="h-px min-w-4 flex-1 border-b border-dotted border-foreground/25" />
            <span className="shrink-0 tabular-nums text-foreground/50">{entry.folio}</span>
          </li>
        ))}
      </ol>
    </SheetFrame>
  );
}
