import type { CSSProperties, ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";
import { splitBlocks, type Block } from "@/lib/paginate";

/**
 * One chapter laid out like a printed page.
 *
 * Standalone on purpose: it takes the chapter's markdown, the format's
 * design and the book's theme, and nothing else — so the studio preview and
 * the future PDF export render exactly the same page. It understands only
 * native markdown: headings, paragraphs, lists, one blockquote, GFM tables.
 *
 * The visual grammar is lifted from the landing's sample books: five chapter
 * openers, three running heads, an optional drop cap, and per-theme accent,
 * heading weight and rule treatment.
 *
 * The body is rendered block by block (see `BookBlocks`), each block in a
 * wrapper the pagination can measure. `BookPage` shows a whole chapter on
 * one tall page; the studio's reading view shows the same blocks cut into
 * fixed-size sheets.
 */
export type BookPageProps = {
  markdown: string;
  design: BookDesign;
  theme: BookTheme;
  chapterNumber: number;
  chapterTitle: string;
  /** Printed as the running head when the design asks for one. */
  bookTitle?: string;
  /** Page number printed at the foot. */
  folio?: number | string;
  className?: string;
};

/** White type only where the accent is dark enough to carry it. */
export function isLight(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

export const WEIGHT: Record<BookTheme["headingWeight"], string> = {
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

/** The CSS variables every book element reads its colours from. */
export function bookVars(theme: BookTheme): CSSProperties {
  return {
    "--book-accent": theme.accent,
    "--book-rule": `${theme.accent}59`,
    "--book-row": `${theme.accent}0d`,
  } as CSSProperties;
}

export function BookPage({
  markdown,
  design,
  theme,
  chapterNumber,
  chapterTitle,
  bookTitle,
  folio,
  className,
}: BookPageProps) {
  const bleeds = design.chapterOpener === "banner" || design.chapterOpener === "block";

  return (
    <div
      lang="en"
      style={bookVars(theme)}
      className={cn(
        "book-page mx-auto w-full max-w-[44rem] bg-[#fdfbf7] px-7 py-10 text-foreground/85 sm:px-12 sm:py-14",
        design.typeface === "serif" ? "font-book" : "font-sans",
        className,
      )}
    >
      {!bleeds ? (
        <RunningHead design={design} accent={theme.accent} bookTitle={bookTitle} />
      ) : null}

      <Opener design={design} theme={theme} number={chapterNumber} title={chapterTitle} />

      <BookBlocks
        blocks={splitBlocks(markdown)}
        design={design}
        theme={theme}
        dropCap={design.dropCap}
        className="mt-10"
      />

      {folio != null ? (
        <footer className="mt-12 text-center text-[0.68rem] tabular-nums tracking-[0.2em] text-foreground/35">
          {folio}
        </footer>
      ) : null}
    </div>
  );
}

/**
 * The chapter body, one wrapper per block. The wrappers carry `data-kind`
 * so that the spacing between blocks — a paragraph after a paragraph, a
 * list item after a list item — is decided by adjacency of wrappers, and
 * so the pagination can measure each block's extent. The same component
 * renders the tall preview page and every sheet of the reading view, which
 * is what makes measured breaks land where the reader sees them.
 */
export function BookBlocks({
  blocks,
  design,
  theme,
  dropCap = false,
  className,
}: {
  blocks: Block[];
  design: BookDesign;
  theme: BookTheme;
  /** Only the chapter's first sheet gets the drop cap. */
  dropCap?: boolean;
  className?: string;
}) {
  const accent = theme.accent;
  const onAccent = isLight(accent) ? "text-foreground" : "text-white";
  const weight = WEIGHT[theme.headingWeight];

  return (
    <div
      className={cn(
        "book-body text-[1.02rem] leading-[1.75]",
        dropCap && "book-body--dropcap",
        /* The first block on a page starts at the top: whatever margin its
           element carries is dropped, on the preview and on every sheet. */
        "[&>:first-child>:first-child]:mt-0",
        /* Consecutive list items are one list to the eye. */
        "[&>[data-kind=li]+[data-kind=li]]:-mt-4 [&>[data-kind=li]+[data-kind=li]>*]:mt-0",
        design.align === "justify"
          ? "text-justify hyphens-auto [&>[data-kind=p]+[data-kind=p]>p]:indent-6"
          : "text-left [&>[data-kind=p]+[data-kind=p]>p]:mt-4",
        className,
      )}
    >
      {blocks.map((block, index) => (
        <div key={index} data-kind={block.kind} data-block={index}>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-0">{children}</p>,
              h1: ({ children }) => (
                <SectionHeading theme={theme} weight={weight}>{children}</SectionHeading>
              ),
              h2: ({ children }) => (
                <SectionHeading theme={theme} weight={weight}>{children}</SectionHeading>
              ),
              h3: ({ children }) => (
                <h3 className={cn("mt-7 mb-2 text-left font-display text-[1.05rem] leading-snug tracking-tight text-foreground", weight)}>
                  {children}
                </h3>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  className={cn(
                    "my-10 border-y px-2 py-7 text-center font-display text-[1.32rem] leading-[1.35] tracking-tight [&>p]:mt-0 [&>p]:indent-0 [&>p]:text-center",
                    weight,
                    theme.rule === "dotted" && "border-dotted border-y-2",
                  )}
                  style={{ borderColor: "var(--book-rule)", color: accent }}
                >
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="my-4 list-disc pl-6 text-left marker:text-[var(--book-accent)] [&>li]:mb-1.5 [&>li>p]:mt-0 [&>li>p]:indent-0">
                  {children}
                </ul>
              ),
              ol: ({ children, start }) => (
                <ol
                  start={start}
                  className="my-4 list-decimal pl-6 text-left marker:font-semibold marker:text-[var(--book-accent)] [&>li]:mb-1.5 [&>li>p]:mt-0 [&>li>p]:indent-0"
                >
                  {children}
                </ol>
              ),
              table: ({ children }) => (
                /* A book page never scrolls: the table takes the column's
                   width, columns share it equally and long words break. */
                <div className="my-8">
                  <table className="w-full table-fixed border-collapse text-left text-[0.86rem] leading-snug break-words [&_tbody_tr:nth-child(even)]:bg-[var(--book-row)]">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  className={cn("px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em]", onAccent)}
                  style={{ backgroundColor: accent }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b px-2 py-2 align-top" style={{ borderColor: "var(--book-rule)" }}>
                  {children}
                </td>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              hr: () => <Rule theme={theme} className="mx-auto my-8" />,
              code: ({ children }) => (
                <code className="rounded bg-foreground/5 px-1 font-mono text-[0.9em]">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="my-6 overflow-x-auto rounded bg-foreground/5 p-3 text-[0.85rem] leading-snug">{children}</pre>
              ),
              a: ({ children }) => <span className="underline underline-offset-2">{children}</span>,
            }}
          >
            {block.markdown}
          </Markdown>
        </div>
      ))}
    </div>
  );
}

/** The theme's rule: hairline, solid bar, or dotted. */
export function Rule({ theme, className }: { theme: BookTheme; className?: string }) {
  if (theme.rule === "bar") {
    return (
      <span
        aria-hidden="true"
        className={cn("block h-0.5 w-8 rounded-full", className)}
        style={{ backgroundColor: "var(--book-accent)" }}
      />
    );
  }
  if (theme.rule === "dotted") {
    return (
      <span
        aria-hidden="true"
        className={cn("block w-10 border-t-2 border-dotted", className)}
        style={{ borderColor: "var(--book-accent)" }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("block h-px w-10", className)}
      style={{ backgroundColor: "var(--book-rule)" }}
    />
  );
}

export function RunningHead({
  design,
  accent,
  bookTitle,
}: {
  design: BookDesign;
  accent: string;
  bookTitle?: string;
}) {
  if (design.runningHead === "none") return null;
  if (design.runningHead === "rule") {
    return (
      <span
        aria-hidden="true"
        className="mb-8 block h-0.5 w-8 rounded-full"
        style={{ backgroundColor: accent }}
      />
    );
  }
  if (!bookTitle) return null;
  return (
    <p
      className="mb-9 border-b pb-2 text-center text-[0.62rem] uppercase tracking-[0.26em]"
      style={{ color: `${accent}99`, borderColor: `${accent}26` }}
    >
      {bookTitle}
    </p>
  );
}

/**
 * How far the banner and block openers reach past the page's padding to
 * bleed to its edges, and the padding they put back. Must match the page.
 */
export type OpenerBleed = {
  /** Cancels the horizontal padding and restores it inside the band. */
  x: string;
  /** Cancels the top padding. */
  top: string;
  /** Restores the top padding inside a full band. */
  padTop: string;
  /** Restores a shallower top padding inside the compact band. */
  padTopCompact: string;
};

/** The tall preview page: responsive, like the page around it. */
const PAGE_BLEED: OpenerBleed = {
  x: "-mx-7 px-7 sm:-mx-12 sm:px-12",
  top: "-mt-10 sm:-mt-14",
  padTop: "pt-10 sm:pt-14",
  padTopCompact: "pt-6 sm:pt-8",
};

/**
 * The chapter opening — the single biggest tell of who typeset a book.
 * `fixed` drops every viewport-dependent size, for sheets whose layout must
 * not change when the window does.
 */
export function Opener({
  design,
  theme,
  number,
  title,
  bleed = PAGE_BLEED,
  fixed = false,
}: {
  design: BookDesign;
  theme: BookTheme;
  number: number;
  title: string;
  bleed?: OpenerBleed;
  fixed?: boolean;
}) {
  const accent = theme.accent;
  const onAccent = isLight(accent) ? "text-foreground" : "text-white";
  const weight = WEIGHT[theme.headingWeight];

  if (design.chapterOpener === "banner") {
    // Full-bleed colour band with the figure knocked out of it.
    return (
      <div
        className={cn(bleed.x, bleed.top, bleed.padTop, "pb-8", onAccent)}
        style={{ backgroundColor: accent }}
      >
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em] opacity-70">Chapter</p>
        <p className="mt-1 font-display text-[4rem] font-extrabold leading-[0.85] tracking-tight">{number}</p>
        <p className={cn("mt-6 max-w-[28rem] font-display text-[1.5rem] leading-[1.2] tracking-tight", weight)}>{title}</p>
      </div>
    );
  }

  if (design.chapterOpener === "block") {
    // Compact band: dense, commercial, straight to the point.
    return (
      <div
        className={cn(bleed.x, bleed.top, bleed.padTopCompact, "pb-5", onAccent)}
        style={{ backgroundColor: accent }}
      >
        <p className="text-[0.66rem] font-bold uppercase tracking-[0.26em] opacity-75">Chapter {number}</p>
        <p className={cn("mt-2 font-display text-[1.45rem] leading-[1.15] tracking-tight", weight)}>{title}</p>
      </div>
    );
  }

  if (design.chapterOpener === "numeral") {
    // Big exercise figure beside its label, title under it.
    return (
      <div>
        <div className="flex items-end gap-3">
          <p className="font-display text-[3.6rem] font-extrabold leading-none tabular-nums" style={{ color: accent }}>
            {number}
          </p>
          <p className="pb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            Chapter
          </p>
        </div>
        <p className={cn("mt-3 max-w-[28rem] font-display text-[1.6rem] leading-[1.2] tracking-tight text-foreground", weight)}>{title}</p>
        <Rule theme={theme} className="mt-4" />
      </div>
    );
  }

  if (design.chapterOpener === "rule") {
    // Sober and institutional: label, title, one long hairline.
    return (
      <div>
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
          Chapter {number}
        </p>
        <p className={cn("mt-3 max-w-[30rem] font-display text-[1.7rem] leading-[1.2] tracking-tight text-foreground", weight)}>{title}</p>
        <span
          aria-hidden="true"
          className={cn("mt-5 block w-full border-t", theme.rule === "dotted" && "border-t-2 border-dotted")}
          style={{ borderColor: "var(--book-rule)" }}
        />
      </div>
    );
  }

  // classic
  return (
    <header className="text-center">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
        Chapter {number}
      </p>
      <p className={cn("mx-auto mt-4 max-w-[26rem] font-display text-[1.85rem] leading-[1.15] tracking-tight text-foreground", !fixed && "sm:text-[2.2rem]", weight)}>
        {title}
      </p>
      <Rule theme={theme} className="mx-auto mt-6" />
    </header>
  );
}

function SectionHeading({ theme, weight, children }: { theme: BookTheme; weight: string; children: ReactNode }) {
  return (
    <div className="mt-10 mb-3 text-left">
      <Rule theme={theme} className="mb-2.5" />
      <h2 className={cn("font-display text-[1.28rem] leading-snug tracking-tight text-foreground", weight)}>
        {children}
      </h2>
    </div>
  );
}
