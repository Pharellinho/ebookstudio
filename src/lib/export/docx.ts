import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignSection,
  WidthType,
  type IParagraphOptions,
  type ISectionOptions,
} from "docx";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import type { Block, BookDocument, DocumentChapter, Inline } from "@/lib/export/document";

/**
 * BookDocument → .docx
 *
 * A Word file the author can keep editing: real headings, real lists, real
 * tables, one section per front-matter page and one for the body, with the
 * book's design applied — typeface family, alignment, the way a chapter
 * opens, the running head — using fonts every copy of Word ships with.
 *
 * Sizes below are in Word's units: half-points for text, twips (1/20 pt)
 * for space. The page is 6 × 9 inches, the trim most self-published books
 * use; margins are 0.75 inch.
 */

const TWIP = 1440; // per inch
const PAGE = { width: 6 * TWIP, height: 9 * TWIP };
const MARGIN = { top: 0.8 * TWIP, right: 0.75 * TWIP, bottom: 0.85 * TWIP, left: 0.75 * TWIP };
/** The width of the text column, which tables fill exactly. */
const TEXT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

const SIZE = {
  body: 22,
  small: 18,
  tiny: 16,
  h1: 44,
  h2: 28,
  h3: 24,
  numeral: 96,
  title: 56,
  subtitle: 26,
  quote: 26,
};

const INK = "1F1F1F";
const MUTED = "6B6B6B";
const PAPER_TINT = "F3F0E8";
const CODE_FONT = "Courier New";

function hex(color: string) {
  return color.replace("#", "").toUpperCase();
}

function fonts(design: BookDesign) {
  return design.typeface === "serif"
    ? { body: "Georgia", display: "Georgia" }
    : { body: "Calibri", display: "Arial" };
}

/** White type only where the accent is dark enough to carry it. */
function onAccent(accent: string) {
  const raw = accent.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? INK : "FFFFFF";
}

type Look = {
  design: BookDesign;
  theme: BookTheme;
  accent: string;
  onAccent: string;
  font: { body: string; display: string };
  headingBold: boolean;
};

function lookOf(design: BookDesign, theme: BookTheme): Look {
  return {
    design,
    theme,
    accent: hex(theme.accent),
    onAccent: onAccent(theme.accent),
    font: fonts(design),
    headingBold: theme.headingWeight !== "semibold",
  };
}

/* ---------------------------------------------------------------------------
   Inline runs
--------------------------------------------------------------------------- */

function runs(inlines: Inline[], look: Look, base: { size?: number; color?: string; font?: string; italics?: boolean; bold?: boolean } = {}) {
  const out: (TextRun | ExternalHyperlink)[] = [];
  for (const inline of inlines) {
    const parts = inline.text.split("\n");
    parts.forEach((part, index) => {
      const run = new TextRun({
        text: part,
        bold: inline.bold || base.bold,
        italics: inline.italic || base.italics,
        font: inline.code ? CODE_FONT : base.font,
        size: inline.code ? (base.size ?? SIZE.body) - 2 : base.size,
        color: inline.href ? "1A5FB4" : base.color,
        underline: inline.href ? {} : undefined,
        break: index > 0 ? 1 : undefined,
      });
      if (inline.href) {
        out.push(new ExternalHyperlink({ link: inline.href, children: [run] }));
      } else {
        out.push(run);
      }
    });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Blocks
--------------------------------------------------------------------------- */

const LIST_REF_BULLETS = "book-bullets";
const listRef = (start: number) => `book-numbers-${start}`;

function paragraphOptions(look: Look, indentFirstLine: boolean): Partial<IParagraphOptions> {
  return look.design.align === "justify"
    ? {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0, line: 276 },
        indent: indentFirstLine ? { firstLine: 0.25 * TWIP } : undefined,
      }
    : { alignment: AlignmentType.LEFT, spacing: { after: 160, line: 276 } };
}

function headingParagraph(block: Extract<Block, { type: "heading" }>, look: Look): Paragraph {
  if (block.level === 1 || block.level === 2) {
    // A section inside a chapter: the theme's rule above, then the title.
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      spacing: { before: 360, after: 120 },
      border: {
        top: {
          style: look.theme.rule === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE,
          size: look.theme.rule === "hairline" ? 4 : 12,
          color: look.accent,
          space: 6,
        },
      },
      children: runs(block.inlines, look, {
        size: SIZE.h2,
        bold: look.headingBold,
        font: look.font.display,
        color: INK,
      }),
    });
  }
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    spacing: { before: 240, after: 80 },
    children: runs(block.inlines, look, { size: SIZE.h3, bold: true, font: look.font.display, color: INK }),
  });
}

function listParagraphs(block: Extract<Block, { type: "list" }>, look: Look, instance: number): Paragraph[] {
  return block.items.map(
    (item, index) =>
      new Paragraph({
        numbering: {
          reference: block.ordered ? listRef(block.start) : LIST_REF_BULLETS,
          level: 0,
          instance,
        },
        alignment: AlignmentType.LEFT,
        // The last item carries the room that separates the list from what follows.
        spacing: { after: index === block.items.length - 1 ? 200 : 80, line: 276 },
        children: runs(item, look),
      }),
  );
}

function quoteParagraphs(block: Extract<Block, { type: "quote" }>, look: Look): Paragraph[] {
  const rule = {
    style: look.theme.rule === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE,
    size: 6,
    color: look.accent,
    space: 10,
  };
  return block.paragraphs.map(
    (inlines, index) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: 0.35 * TWIP, right: 0.35 * TWIP },
        spacing: {
          before: index === 0 ? 320 : 80,
          after: index === block.paragraphs.length - 1 ? 320 : 80,
          line: 300,
        },
        border: {
          top: index === 0 ? rule : undefined,
          bottom: index === block.paragraphs.length - 1 ? rule : undefined,
        },
        children: runs(inlines, look, {
          size: SIZE.quote,
          bold: look.headingBold,
          font: look.font.display,
          color: look.accent,
        }),
      }),
  );
}

function tableBlock(block: Extract<Block, { type: "table" }>, look: Look): Table {
  const columns = Math.max(block.header.length, ...block.rows.map((row) => row.length), 1);
  const alignmentOf = (index: number) =>
    block.align[index] === "center"
      ? AlignmentType.CENTER
      : block.align[index] === "right"
        ? AlignmentType.RIGHT
        : AlignmentType.LEFT;
  const hairline = { style: BorderStyle.SINGLE, size: 4, color: "D9D4C7" };
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const cellMargins = { top: 80, bottom: 80, left: 100, right: 100 };
  /* Without explicit widths Word and every other reader squeeze the
     columns to a few characters. Equal columns across the text width. */
  const columnWidth = Math.floor(TEXT_WIDTH / columns);
  const cellWidth = { size: columnWidth, type: WidthType.DXA } as const;

  const headerRow = new TableRow({
    tableHeader: true,
    children: Array.from({ length: columns }, (_, index) =>
      new TableCell({
        width: cellWidth,
        shading: { type: ShadingType.CLEAR, fill: look.accent, color: "auto" },
        borders: { top: none, bottom: none, left: none, right: none },
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: alignmentOf(index),
            spacing: { after: 0 },
            children: runs(block.header[index] ?? [], look, {
              size: SIZE.tiny,
              bold: true,
              color: look.onAccent,
              font: look.font.display,
            }),
          }),
        ],
      }),
    ),
  });

  const bodyRows = block.rows.map(
    (row, rowIndex) =>
      new TableRow({
        cantSplit: true,
        children: Array.from({ length: columns }, (_, index) =>
          new TableCell({
            width: cellWidth,
            shading:
              rowIndex % 2 === 1 ? { type: ShadingType.CLEAR, fill: PAPER_TINT, color: "auto" } : undefined,
            borders: { top: none, bottom: hairline, left: none, right: none },
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: alignmentOf(index),
                spacing: { after: 0, line: 260 },
                children: runs(row[index] ?? [], look, { size: SIZE.small }),
              }),
            ],
          }),
        ),
      }),
  );

  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: Array.from({ length: columns }, () => columnWidth),
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...bodyRows],
  });
}

function blocksToChildren(blocks: Block[], look: Look, counter: { list: number }): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let previous: Block["type"] | null = null;
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(headingParagraph(block, look));
        break;
      case "paragraph":
        out.push(
          new Paragraph({
            ...paragraphOptions(look, previous === "paragraph"),
            children: runs(block.inlines, look),
          }),
        );
        break;
      case "list":
        counter.list += 1;
        out.push(...listParagraphs(block, look, counter.list));
        break;
      case "quote":
        out.push(...quoteParagraphs(block, look));
        break;
      case "table":
        out.push(tableBlock(block, look));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case "image":
        // Pictures are not fetched from arbitrary URLs; the place is marked.
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: `[Image: ${block.alt || "untitled"}]`, italics: true, color: MUTED, size: SIZE.small })],
          }),
        );
        break;
    }
    previous = block.type;
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Chapter openers — the same five identities as the studio's pages
--------------------------------------------------------------------------- */

function opener(chapter: DocumentChapter, look: Look): Paragraph[] {
  const { design } = look;
  const label = `Chapter ${chapter.number}`;
  const display = look.font.display;

  if (design.chapterOpener === "banner" || design.chapterOpener === "block") {
    // A solid band of the accent, edge to edge of the text column, with the
    // figure and the title knocked out of it in white (or ink on a pale accent).
    const band = { type: ShadingType.CLEAR, fill: look.accent, color: "auto" } as const;
    const pad = { left: 0.2 * TWIP, right: 0.2 * TWIP };
    const inBand = (children: TextRun[], extra: Partial<IParagraphOptions> = {}) =>
      new Paragraph({ shading: band, indent: pad, keepNext: true, spacing: { before: 0, after: 0, line: 240 }, ...extra, children });
    const spacer = () => new TextRun({ text: " ", size: SIZE.h3 });
    const banner = design.chapterOpener === "banner";
    return [
      inBand([spacer()], { pageBreakBefore: true }),
      inBand([
        new TextRun({
          text: banner ? "CHAPTER" : label.toUpperCase(),
          size: SIZE.tiny,
          bold: true,
          color: look.onAccent,
          font: display,
          characterSpacing: 60,
        }),
      ]),
      ...(banner
        ? [inBand([new TextRun({ text: String(chapter.number), size: SIZE.numeral, bold: true, color: look.onAccent, font: display })])]
        : []),
      inBand([new TextRun({ text: chapter.title, size: SIZE.h1 - 8, bold: look.headingBold, color: look.onAccent, font: display })], {
        heading: HeadingLevel.HEADING_1,
        spacing: { before: banner ? 200 : 60, after: 0, line: 260 },
      }),
      inBand([spacer()], { spacing: { before: 0, after: 360, line: 240 } }),
    ];
  }

  if (design.chapterOpener === "numeral") {
    return [
      new Paragraph({
        pageBreakBefore: true,
        spacing: { before: 600, after: 0, line: 240 },
        children: [
          new TextRun({ text: String(chapter.number), size: SIZE.numeral, bold: true, color: look.accent, font: display }),
          new TextRun({ text: "   CHAPTER", size: SIZE.tiny, bold: true, color: look.accent, font: display, characterSpacing: 40 }),
        ],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: look.accent, space: 8 } },
        children: [new TextRun({ text: chapter.title, size: SIZE.h1, bold: look.headingBold, color: INK, font: display })],
      }),
      new Paragraph({ spacing: { after: 240 }, children: [] }),
    ];
  }

  if (design.chapterOpener === "rule") {
    return [
      new Paragraph({
        pageBreakBefore: true,
        spacing: { before: 600, after: 120 },
        children: [new TextRun({ text: label.toUpperCase(), size: SIZE.tiny, bold: true, color: look.accent, font: display, characterSpacing: 60 })],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 0, after: 160 },
        border: {
          bottom: {
            style: look.theme.rule === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE,
            size: 4,
            color: look.accent,
            space: 10,
          },
        },
        children: [new TextRun({ text: chapter.title, size: SIZE.h1, bold: look.headingBold, color: INK, font: display })],
      }),
      new Paragraph({ spacing: { after: 240 }, children: [] }),
    ];
  }

  // classic
  return [
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 160 },
      children: [new TextRun({ text: label.toUpperCase(), size: SIZE.tiny, bold: true, color: look.accent, font: display, characterSpacing: 80 })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: chapter.title, size: SIZE.h1, bold: look.headingBold, color: INK, font: display })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [new TextRun({ text: "❦", size: SIZE.h3, color: look.accent })],
    }),
  ];
}

/* ---------------------------------------------------------------------------
   Front matter
--------------------------------------------------------------------------- */

/** A short rule in the accent, centred: an empty paragraph whose bottom
 *  border is squeezed between two wide indents. A typed dash looked like a
 *  typo next to a big title. */
function shortRule(look: Look, spacing: { before: number; after: number }): Paragraph {
  const inset = (TEXT_WIDTH - 0.9 * TWIP) / 2;
  return new Paragraph({
    indent: { left: inset, right: inset },
    spacing: { before: spacing.before, after: spacing.after, line: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: look.accent, space: 1 } },
    children: [new TextRun({ text: " ", size: SIZE.tiny })],
  });
}

function titlePage(doc: BookDocument, look: Look): Paragraph[] {
  const { title, subtitle, author } = doc.frontMatter.titlePage;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title, size: SIZE.title, bold: look.headingBold, font: look.font.display, color: INK })],
    }),
    shortRule(look, { before: 0, after: 320 }),
    ...(subtitle
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            children: [new TextRun({ text: subtitle, size: SIZE.subtitle, italics: true, color: MUTED })],
          }),
        ]
      : []),
    ...(author
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [new TextRun({ text: author.toUpperCase(), size: SIZE.small, characterSpacing: 80, color: look.accent, font: look.font.display })],
          }),
        ]
      : []),
  ];
}

function copyrightPage(doc: BookDocument): Paragraph[] {
  return doc.frontMatter.copyright.lines.map(
    (line, index) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: index === 0 ? 240 : 120, line: 260 },
        children: [new TextRun({ text: line, size: SIZE.tiny, color: MUTED, bold: index === 0 })],
      }),
  );
}

function contentsPage(doc: BookDocument, look: Look): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: "Contents", size: SIZE.h2, bold: look.headingBold, font: look.font.display, color: INK })],
    }),
    shortRule(look, { before: 0, after: 480 }),
    ...doc.frontMatter.contents.entries.map(
      (entry) =>
        new Paragraph({
          spacing: { after: 140, line: 276 },
          indent: { left: 0.45 * TWIP, hanging: 0.45 * TWIP },
          children: [
            new TextRun({ text: `${entry.number}`, size: SIZE.body, bold: true, color: look.accent, font: look.font.display }),
            new TextRun({ text: `\t${entry.title}`, size: SIZE.body }),
          ],
        }),
    ),
  ];
}

/** The cover fills its own page edge to edge, no margins, no header. */
function coverSection(doc: BookDocument): ISectionOptions | null {
  if (!doc.cover) return null;
  // Word sizes pictures in pixels at 96 per inch; the page is 6 × 9 inches.
  const width = 6 * 96;
  const height = 9 * 96;
  return {
    properties: { page: { size: PAGE, margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new ImageRun({
            type: doc.cover.type,
            data: doc.cover.data,
            transformation: { width, height },
            altText: { title: "Cover", description: `Cover of ${doc.meta.title}`, name: "cover" },
          }),
        ],
      }),
    ],
  };
}

/* ---------------------------------------------------------------------------
   The file
--------------------------------------------------------------------------- */

function frontSection(children: Paragraph[], verticalAlign?: (typeof VerticalAlignSection)[keyof typeof VerticalAlignSection]): ISectionOptions {
  return {
    properties: {
      page: { size: PAGE, margin: MARGIN },
      verticalAlign,
    },
    children,
  };
}

/** Every ordered list that starts at a number other than 1 needs its own numbering. */
function listStarts(doc: BookDocument): number[] {
  const starts = new Set<number>([1]);
  for (const chapter of doc.chapters) {
    for (const block of chapter.blocks) {
      if (block.type === "list" && block.ordered) starts.add(block.start);
    }
  }
  return [...starts];
}

export async function renderDocx(
  doc: BookDocument,
  design: BookDesign,
  theme: BookTheme,
  options: { frontMatter?: boolean } = {},
): Promise<Buffer> {
  const withFront = options.frontMatter !== false;
  const cover = withFront ? coverSection(doc) : null;
  const look = lookOf(design, theme);
  const counter = { list: 0 };

  const body: (Paragraph | Table)[] = [];
  for (const chapter of doc.chapters) {
    body.push(...opener(chapter, look));
    body.push(...blocksToChildren(chapter.blocks, look, counter));
  }

  const runningHead =
    design.runningHead === "smallcaps"
      ? new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [new TextRun({ text: doc.meta.title.toUpperCase(), size: SIZE.tiny, color: MUTED, characterSpacing: 60 })],
            }),
          ],
        })
      : undefined;

  const file = new Document({
    creator: "EbookStudio",
    title: doc.meta.title,
    subject: doc.meta.subtitle ?? undefined,
    description: doc.meta.subtitle ?? undefined,
    styles: {
      default: {
        document: { run: { font: look.font.body, size: SIZE.body, color: INK } },
        heading1: { run: { font: look.font.display, size: SIZE.h1, bold: look.headingBold, color: INK } },
        heading2: { run: { font: look.font.display, size: SIZE.h2, bold: look.headingBold, color: INK } },
        heading3: { run: { font: look.font.display, size: SIZE.h3, bold: true, color: INK } },
      },
    },
    numbering: {
      config: [
        {
          reference: LIST_REF_BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 0.4 * TWIP, hanging: 0.2 * TWIP } }, run: { color: look.accent } },
            },
          ],
        },
        ...listStarts(doc).map((start) => ({
          reference: listRef(start),
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              start,
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 0.4 * TWIP, hanging: 0.25 * TWIP } }, run: { color: look.accent, bold: true } },
            },
          ],
        })),
      ],
    },
    sections: [
      ...(cover ? [cover] : []),
      ...(withFront
        ? [
            frontSection(titlePage(doc, look), VerticalAlignSection.CENTER),
            frontSection(copyrightPage(doc), VerticalAlignSection.BOTTOM),
            frontSection(contentsPage(doc, look)),
          ]
        : []),
      {
        properties: {
          page: { size: PAGE, margin: MARGIN, pageNumbers: { start: 1 } },
        },
        headers: runningHead ? { default: runningHead } : undefined,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ children: [PageNumber.CURRENT], size: SIZE.tiny, color: MUTED })],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(file);
}

/** "The Organic Instagram Growth Playbook" → "the-organic-instagram-growth-playbook.docx" */
export function docxFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "book"}.docx`;
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
