import type { CSSProperties, ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { cn } from "@/lib/cn";

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
function isLight(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

const WEIGHT: Record<BookTheme["headingWeight"], string> = {
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

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
  const accent = theme.accent;
  const onAccent = isLight(accent) ? "text-foreground" : "text-white";
  const weight = WEIGHT[theme.headingWeight];
  const bleeds = design.chapterOpener === "banner" || design.chapterOpener === "block";

  const style = {
    "--book-accent": accent,
    "--book-rule": `${accent}59`,
    "--book-row": `${accent}0d`,
  } as CSSProperties;

  return (
    <div
      lang="en"
      style={style}
      className={cn(
        "book-page mx-auto w-full max-w-[44rem] bg-[#fdfbf7] px-7 py-10 text-foreground/85 sm:px-12 sm:py-14",
        design.typeface === "serif" ? "font-book" : "font-sans",
        className,
      )}
    >
      {!bleeds ? (
        <RunningHead design={design} accent={accent} bookTitle={bookTitle} />
      ) : null}

      <Opener
        design={design}
        theme={theme}
        onAccent={onAccent}
        weight={weight}
        number={chapterNumber}
        title={chapterTitle}
      />

      {/* `.book-body` carries the drop cap rule (globals.css): the first
          direct-child paragraph only, so a quote or a list never gets one. */}
      <div
        className={cn(
          "book-body mt-10 text-[1.02rem] leading-[1.75]",
          design.dropCap && "book-body--dropcap",
          design.align === "justify"
            ? "text-justify hyphens-auto [&>p+p]:indent-6"
            : "text-left [&>p+p]:mt-4",
        )}
      >
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
            ol: ({ children }) => (
              <ol className="my-4 list-decimal pl-6 text-left marker:font-semibold marker:text-[var(--book-accent)] [&>li]:mb-1.5 [&>li>p]:mt-0 [&>li>p]:indent-0">
                {children}
              </ol>
            ),
            table: ({ children }) => (
              <div className="my-8 overflow-x-auto">
                <table className="w-full border-collapse text-left text-[0.92rem] leading-snug [&_tbody_tr:nth-child(even)]:bg-[var(--book-row)]">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th
                className={cn("px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em]", onAccent)}
                style={{ backgroundColor: accent }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b px-3 py-2 align-top" style={{ borderColor: "var(--book-rule)" }}>
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
            a: ({ children }) => <span className="underline underline-offset-2">{children}</span>,
          }}
        >
          {markdown}
        </Markdown>
      </div>

      {folio != null ? (
        <footer className="mt-12 text-center text-[0.68rem] tabular-nums tracking-[0.2em] text-foreground/35">
          {folio}
        </footer>
      ) : null}
    </div>
  );
}

/** The theme's rule: hairline, solid bar, or dotted. */
function Rule({ theme, className }: { theme: BookTheme; className?: string }) {
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

function RunningHead({
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

function Opener({
  design,
  theme,
  onAccent,
  weight,
  number,
  title,
}: {
  design: BookDesign;
  theme: BookTheme;
  onAccent: string;
  weight: string;
  number: number;
  title: string;
}) {
  const accent = theme.accent;

  if (design.chapterOpener === "banner") {
    // Full-bleed colour band with the figure knocked out of it.
    return (
      <div
        className={cn("-mx-7 -mt-10 px-7 pb-8 pt-10 sm:-mx-12 sm:-mt-14 sm:px-12 sm:pt-14", onAccent)}
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
        className={cn("-mx-7 -mt-10 px-7 pb-5 pt-6 sm:-mx-12 sm:-mt-14 sm:px-12 sm:pt-8", onAccent)}
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
      <p className={cn("mx-auto mt-4 max-w-[26rem] font-display text-[1.85rem] leading-[1.15] tracking-tight text-foreground sm:text-[2.2rem]", weight)}>
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
