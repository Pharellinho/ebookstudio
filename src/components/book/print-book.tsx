"use client";

import { useEffect } from "react";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import { useBookLayout, type ChapterSource } from "@/components/book/book-layout";
import { Sheet } from "@/components/book/book-reader";
import { SHEET } from "@/components/book/book-sheets";

/* A 6 × 9 inch page is 576 × 864 CSS pixels; the sheets are laid out at
   460 × 690 and scaled up as a whole, exactly like in the reader. */
const PAGE_PX = { width: 576, height: 864 };
const SCALE = PAGE_PX.width / SHEET.width;
/* Print interior: the sheet's own margin is 0.52 in; the text block moves
   0.1 in away from the spine, giving 0.62 in inside and 0.42 in outside.
   That clears KDP's gutter rule up to 500 pages and its 0.25 in outside. */
const GUTTER_PX = 0.1 * 96;

export type PrintVariant = "digital" | "print";

/**
 * The book as printed pages, one after the other, for the headless browser
 * behind the PDF export. Same layout hook, same sheets as the studio's
 * reader, so the file is the Preview page for page. When the layout is
 * measured, the fonts are in and the cover has decoded, the page marks
 * <html data-print-ready="1"> and the browser prints.
 */
export function PrintBook({
  variant = "digital",
  bookTitle,
  subtitle,
  author,
  coverUrl,
  chapters,
  design,
  theme,
}: {
  variant?: PrintVariant;
  bookTitle: string;
  subtitle: string | null;
  author: string;
  coverUrl: string | null;
  chapters: ChapterSource[];
  design: BookDesign;
  theme: BookTheme;
}) {
  const { layout, source, measurer } = useBookLayout(chapters, design, theme, bookTitle);

  /* The interior starts at the title page: KDP takes the cover separately,
     and the blank inside-cover page goes with it. */
  const sheets = layout
    ? variant === "print"
      ? layout.sheets.filter((sheet) => sheet.kind !== "cover" && sheet.kind !== "blank")
      : layout.sheets
    : [];

  useEffect(() => {
    if (!layout) return;
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.complete
            ? image.decode().catch(() => undefined)
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
      if (!cancelled) document.documentElement.dataset.printReady = "1";
    })();
    return () => {
      cancelled = true;
    };
  }, [layout]);

  return (
    <>
      <style>{`
        @page { size: ${PAGE_PX.width}px ${PAGE_PX.height}px; margin: 0; }
        html, body { margin: 0; padding: 0; background: #ffffff; }
        .print-page { width: ${PAGE_PX.width}px; height: ${PAGE_PX.height}px; overflow: hidden; position: relative; }
        @media screen { body { background: #e5e5e5; } .print-page { margin: 0 auto 16px; box-shadow: 0 1px 4px rgba(0,0,0,.2); } }
      `}</style>
      {measurer}
      {layout ? (
        sheets.map((sheet, position) => {
          /* Page 1 is a right-hand page; its spine is on the left. The text
             block moves away from the spine, one way on odd pages, the other
             on even ones. */
          const recto = position % 2 === 0;
          const shift = variant === "print" ? (recto ? GUTTER_PX : -GUTTER_PX) : 0;
          return (
          /* The break is set inline: a `:last-child` rule cannot be trusted
             when the app appends its own nodes after the pages, and a break
             after the last page prints a blank one. */
          <div
            key={position}
            className="print-page"
            style={{ breakAfter: position === sheets.length - 1 ? "auto" : "page" }}
          >
            <div style={{ width: SHEET.width, height: SHEET.height, transform: `translateX(${shift}px) scale(${SCALE})`, transformOrigin: "top left" }}>
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
            </div>
          </div>
          );
        })
      ) : (
        <p style={{ padding: 24, fontFamily: "sans-serif", color: "#666" }}>Laying out the book…</p>
      )}
    </>
  );
}
