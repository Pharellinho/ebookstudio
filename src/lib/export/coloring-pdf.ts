import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * A coloring book as a PDF, page by page, without a browser: every page is
 * a picture placed on an 8.5 × 11 in sheet. Two front pages are typeset
 * here with the PDF's standard fonts: the title page and the "this book
 * belongs to" page every coloring book has.
 *
 * "digital": cover first, for selling as a file.
 * "print": no cover (KDP takes it separately); optionally a blank page
 * behind every picture so markers never show through.
 */

const PAGE = { width: 612, height: 792 }; // 8.5 × 11 in at 72 pt
const MARGIN = 36; // 0.5 in, KDP's minimum is 0.25
const INK = rgb(0.12, 0.12, 0.12);
const SOFT = rgb(0.45, 0.45, 0.45);

export type ColoringPdfInput = {
  title: string;
  subtitle: string | null;
  author: string;
  /** PNG bytes, in page order. */
  pages: Buffer[];
  /** JPEG or PNG bytes of the front cover, when the book has one. */
  cover: { data: Buffer; type: "png" | "jpg" } | null;
  variant: "digital" | "print";
  blankVersos: boolean;
};

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE.width - width) / 2, y, size, font, color });
}

/** Breaks a line into lines that fit the text width. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderColoringPdf(input: ColoringPdfInput): Promise<{ file: Buffer; pages: number }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  if (input.author) pdf.setAuthor(input.author);
  pdf.setProducer("EbookStudio");
  pdf.setCreator("EbookStudio");
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  // Cover, full bleed, digital only.
  if (input.variant === "digital" && input.cover) {
    const image =
      input.cover.type === "png" ? await pdf.embedPng(input.cover.data) : await pdf.embedJpg(input.cover.data);
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    const scale = Math.max(PAGE.width / image.width, PAGE.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (PAGE.width - width) / 2, y: (PAGE.height - height) / 2, width, height });
  }

  // Title page.
  {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    const lines = wrap(input.title, bold, 34, PAGE.width - MARGIN * 4);
    let y = PAGE.height * 0.62;
    for (const line of lines) {
      centered(page, line, bold, 34, y);
      y -= 42;
    }
    if (input.subtitle) {
      y -= 8;
      for (const line of wrap(input.subtitle, regular, 15, PAGE.width - MARGIN * 4)) {
        centered(page, line, regular, 15, y, SOFT);
        y -= 20;
      }
    }
    if (input.author) centered(page, input.author.toUpperCase(), regular, 11, PAGE.height * 0.2, SOFT);
  }

  // "This book belongs to" page.
  {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    centered(page, "This book belongs to", bold, 22, PAGE.height * 0.6);
    const lineY = PAGE.height * 0.52;
    page.drawLine({
      start: { x: PAGE.width * 0.22, y: lineY },
      end: { x: PAGE.width * 0.78, y: lineY },
      thickness: 1,
      color: INK,
    });
    centered(page, "Colour every page your way. There is no wrong colour.", regular, 12, PAGE.height * 0.4, SOFT);
  }

  // The pictures, each fitted inside the margins, keeping its shape.
  const box = { width: PAGE.width - MARGIN * 2, height: PAGE.height - MARGIN * 2 };
  for (const bytes of input.pages) {
    const image = await pdf.embedPng(bytes);
    const scale = Math.min(box.width / image.width, box.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawImage(image, { x: (PAGE.width - width) / 2, y: (PAGE.height - height) / 2, width, height });
    if (input.variant === "print" && input.blankVersos) pdf.addPage([PAGE.width, PAGE.height]);
  }

  const bytes = await pdf.save({ useObjectStreams: true });
  return { file: Buffer.from(bytes), pages: pdf.getPageCount() };
}
