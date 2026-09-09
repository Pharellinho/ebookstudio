import "server-only";
import {
  PDFDocument,
  StandardFonts,
  clip,
  degrees,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { PNG } from "pngjs";
import { decode as decodeJpeg } from "jpeg-js";

/**
 * The full cover a printer takes: one PDF page holding the back cover, the
 * spine and the front cover side by side, bleed all around.
 *
 *   ┌──────────────┬──┬──────────────┐
 *   │  back cover  │sp│ front cover  │   height (with bleed)
 *   └──────────────┴──┴──────────────┘
 *              totalWidth (with bleed)
 *
 * Every dimension comes from the caller, who got them from the printer's
 * own calculator (page count, paper, binding). Nothing here derives a
 * spine width: a spiral-bound book simply arrives with a spine of zero and
 * the sheet has two faces, through the very same code.
 */

export type CoverWrapDimensions = {
  /** Full sheet width in inches, bleed included: back + spine + front + 2 × bleed. */
  totalWidth: number;
  /** Full sheet height in inches, bleed included. */
  height: number;
  /** Spine width in inches; 0 for coil or spiral binding. */
  spineWidth: number;
  /** Bleed on each of the four sides, inches. 0.125 for KDP and Lulu. */
  bleed: number;
  /** Distance from the trim inside which nothing important sits, inches. */
  safety?: number;
};

export type CoverWrapInput = {
  /** The front cover picture, as generated. */
  front: { data: Buffer; type: "png" | "jpg" };
  title: string;
  subtitle: string | null;
  author: string;
  /** Up to two short lines printed on the back, when the book has them. */
  description?: string[] | null;
  dimensions: CoverWrapDimensions;
  /**
   * The flat colour of the back and the spine, "#rrggbb". When absent it is
   * sampled from the front picture's edge, so the back reads as a
   * continuation of the front; failing that a deep neutral is used.
   */
  backColor?: string | null;
  /** Draw the trim and safety lines, for checking a proof. Never for a printer. */
  guides?: boolean;
};

const PT = 72;
const DEFAULT_SAFETY_IN = 0.5;
/** KDP prints spine text only from this width; narrower spines stay plain. */
const MIN_SPINE_FOR_TEXT_IN = 0.25;
const FALLBACK_BACK = "#1a1f2e";

function hexToRgb(hex: string): RGB {
  const raw = hex.replace("#", "");
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(value, 16);
  if (!Number.isFinite(n) || value.length !== 6) return hexToRgb(FALLBACK_BACK);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function isLight(color: RGB): boolean {
  return (color.red * 299 + color.green * 587 + color.blue * 114) / 1000 > 0.6;
}

/**
 * The average colour of the picture's left edge, the side that meets the
 * spine: the back cover then looks like a continuation of the front.
 * Returns null when the bytes cannot be read.
 */
export function edgeColorOf(front: CoverWrapInput["front"]): string | null {
  try {
    const image =
      front.type === "png"
        ? PNG.sync.read(front.data)
        : decodeJpeg(front.data, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 512 });
    const strip = Math.max(1, Math.floor(image.width * 0.04));
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let y = 0; y < image.height; y += 4) {
      for (let x = 0; x < strip; x += 2) {
        const i = (y * image.width + x) * 4;
        r += image.data[i];
        g += image.data[i + 1];
        b += image.data[i + 2];
        count += 1;
      }
    }
    if (count === 0) return null;
    const hex = (v: number) => Math.round(v / count).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return null;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Text lines from the top of a box downwards, centred; returns the y left. */
function paragraph(
  page: PDFPage,
  lines: string[],
  font: PDFFont,
  size: number,
  color: RGB,
  box: { x: number; width: number },
  top: number,
  leading: number,
): number {
  let y = top - size;
  for (const line of lines) {
    const width = font.widthOfTextAtSize(line, size);
    page.drawText(line, { x: box.x + (box.width - width) / 2, y, size, font, color });
    y -= leading;
  }
  return y;
}

export async function renderCoverWrap(input: CoverWrapInput): Promise<Buffer> {
  const { dimensions: d } = input;
  const safetyIn = d.safety ?? DEFAULT_SAFETY_IN;
  const totalW = d.totalWidth * PT;
  const totalH = d.height * PT;
  const bleed = d.bleed * PT;
  const spine = d.spineWidth * PT;
  const safety = safetyIn * PT;
  /* The faces share what is left once the spine and the two bleeds are out. */
  const face = (totalW - spine - 2 * bleed) / 2;
  if (face <= 0 || totalH <= 2 * bleed) throw new Error("Cover dimensions leave no room for a face");

  const backX = 0; // bleed included
  const spineX = bleed + face;
  const frontX = spineX + spine;

  const back = hexToRgb(input.backColor ?? edgeColorOf(input.front) ?? FALLBACK_BACK);
  const ink = isLight(back) ? rgb(0.1, 0.1, 0.1) : rgb(1, 1, 1);
  const soft = isLight(back) ? rgb(0.25, 0.25, 0.25) : rgb(0.92, 0.92, 0.92);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${input.title} — cover`);
  if (input.author) pdf.setAuthor(input.author);
  pdf.setProducer("EbookStudio");
  pdf.setCreator("EbookStudio");
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([totalW, totalH]);

  /* Back and spine: one flat colour, bleed included. */
  page.drawRectangle({ x: backX, y: 0, width: frontX - backX, height: totalH, color: back });

  /* Front: the picture, cropped to cover its face plus the bleed on the
     outer three sides, clipped so it never crosses onto the spine. */
  const picture =
    input.front.type === "png" ? await pdf.embedPng(input.front.data) : await pdf.embedJpg(input.front.data);
  const frontW = totalW - frontX;
  const scale = Math.max(frontW / picture.width, totalH / picture.height);
  const drawnW = picture.width * scale;
  const drawnH = picture.height * scale;
  page.pushOperators(pushGraphicsState(), rectangle(frontX, 0, frontW, totalH), clip(), endPath());
  page.drawImage(picture, {
    x: frontX + (frontW - drawnW) / 2,
    y: (totalH - drawnH) / 2,
    width: drawnW,
    height: drawnH,
  });
  page.pushOperators(popGraphicsState());

  /* Back cover text, inside the safety zone of the back face. */
  const box = { x: bleed + safety, width: face - 2 * safety };
  const top = totalH - bleed - safety;
  const bottom = bleed + safety;
  const titleSize = face > 5 * PT ? 30 : 24;
  let y = top - 0.35 * PT;
  y = paragraph(page, wrap(input.title, bold, titleSize, box.width), bold, titleSize, ink, box, y, titleSize * 1.18);
  if (input.subtitle) {
    y -= 6;
    y = paragraph(page, wrap(input.subtitle, regular, 13, box.width), regular, 13, soft, box, y, 17);
  }
  /* A short rule, then the description. */
  y -= 14;
  page.drawRectangle({ x: box.x + box.width / 2 - 18, y, width: 36, height: 1.5, color: soft });
  y -= 22;
  const description = (input.description ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 2);
  for (const line of description) {
    y = paragraph(page, wrap(line, regular, 12, box.width), regular, 12, soft, box, y, 16);
    y -= 4;
  }
  if (input.author) {
    const label = input.author.toUpperCase();
    const size = 10;
    const width = regular.widthOfTextAtSize(label, size);
    page.drawText(label, { x: box.x + (box.width - width) / 2, y: bottom + 0.1 * PT, size, font: regular, color: soft });
  }

  /* Spine text, only when the spine is wide enough to carry it, reading
     top to bottom as on a shelf. The same code runs with a zero spine: the
     condition simply does not hold. */
  if (d.spineWidth >= MIN_SPINE_FOR_TEXT_IN) {
    const size = Math.min(14, Math.floor(spine * 0.5));
    const text = input.title;
    const available = totalH - 2 * bleed - 2 * safety;
    const fits = bold.widthOfTextAtSize(text, size) <= available ? text : `${text.slice(0, 40)}…`;
    const width = bold.widthOfTextAtSize(fits, size);
    page.drawText(fits, {
      x: spineX + spine / 2 + size * 0.35,
      y: totalH / 2 + width / 2,
      size,
      font: bold,
      color: ink,
      rotate: degrees(-90),
    });
  }

  if (input.guides) {
    const guide = rgb(1, 0, 0.4);
    const trim = { x: bleed, y: bleed, width: totalW - 2 * bleed, height: totalH - 2 * bleed };
    page.drawRectangle({ ...trim, borderColor: guide, borderWidth: 0.75, opacity: 0, borderOpacity: 0.9 });
    for (const x of [spineX, frontX]) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: totalH }, thickness: 0.75, color: guide, opacity: 0.9 });
    }
    const safe = (x: number, width: number) =>
      page.drawRectangle({
        x: x + safety,
        y: bleed + safety,
        width: width - 2 * safety,
        height: totalH - 2 * bleed - 2 * safety,
        borderColor: rgb(0, 0.6, 1),
        borderWidth: 0.75,
        borderDashArray: [4, 3],
        opacity: 0,
        borderOpacity: 0.9,
      });
    safe(bleed, face);
    safe(frontX, face);
  }

  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}
