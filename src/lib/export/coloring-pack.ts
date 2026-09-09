import "server-only";
import JSZip from "jszip";
import type { BookRow } from "@/lib/books";
import { parseColoringSettings } from "@/lib/coloring";
import { listPages } from "@/lib/coloring-pages";
import { downloadCoverArt } from "@/lib/covers";
import type { CoverImage } from "@/lib/export/document";
import { renderColoringPdf } from "@/lib/export/coloring-pdf";
import { renderCoverWrap } from "@/lib/export/cover-wrap";
import { kdpCoverDimensions } from "@/lib/print/kdp";
import { ageBandLabel } from "@/lib/coloring";

/**
 * The pack of a coloring book: one folder per store, and the pictures as
 * single files for those who sell pages one by one.
 *
 *   <title>/
 *     READ-ME.txt
 *     Amazon KDP/       paperback-interior.pdf, paperback-cover.pdf, cover.jpg
 *     Etsy/             printable.pdf, cover.jpg, pages/01.png …
 *     Gumroad/          printable.pdf, cover.jpg, pages/01.png …
 *     Your own site/    printable.pdf, cover.jpg, pages/01.png …
 */

export const KDP_MIN_INTERIOR_PAGES = 24;

function slugOf(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "coloring-book"
  );
}

function folderName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Coloring book";
}

function readMe(input: {
  title: string;
  author: string;
  pictures: number;
  interiorPages: number;
  hasInterior: boolean;
  coverName: string | null;
  blankVersos: boolean;
}): string {
  const cover = input.coverName ?? "cover.jpg";
  return [
    input.title,
    input.author ? `by ${input.author}` : "",
    "",
    `A coloring book of ${input.pictures} pictures, 8.5 x 11 in, black lines on white.`,
    "",
    "Amazon KDP (paperback)",
    input.hasInterior
      ? `  paperback-interior.pdf  Upload as the manuscript: ${input.interiorPages} pages${input.blankVersos ? ", a blank page behind every picture so markers do not show through" : ""}. Choose 8.5 x 11 in, white paper, no bleed.`
      : `  (no paperback interior)  KDP prints books of ${KDP_MIN_INTERIOR_PAGES} pages or more; this one would have ${input.interiorPages}. Add pictures, or turn on blank pages behind each picture, and export again.`,
    input.hasInterior && input.coverName
      ? "  paperback-cover.pdf     The full print cover: back, spine and front, with bleed, sized by KDP's own calculator for this page count on white paper. Upload it as the cover PDF."
      : "",
    input.coverName ? `  ${cover.padEnd(23)} The front cover on its own, for the store page.` : "  (no cover yet)          Generate one in the book's Cover section.",
    "",
    "Etsy / Gumroad / Your own site (printables)",
    "  printable.pdf           The whole book with the cover on page 1, to sell as a file.",
    "  pages/                  Every picture as its own PNG, to sell pages one by one or to print at home.",
    "",
    "Made with EbookStudio.",
  ]
    .filter((line) => line !== undefined)
    .join("\n") + "\n";
}

export async function renderColoringPack(input: {
  book: BookRow;
  cover: CoverImage | null;
  /** Dev bench only: build the print files even under KDP's page minimum. */
  ignoreMinimum?: boolean;
}): Promise<{ file: Buffer; name: string; pages: number }> {
  const { book } = input;
  const settings = parseColoringSettings(book.settings ?? null);
  const blankVersos = settings && settings !== "invalid" ? Boolean(settings.blankVersos) : false;
  const title = book.title ?? book.outline?.title ?? "Coloring book";
  const subtitle = book.subtitle ?? book.outline?.subtitle ?? null;
  const author = (book.cover_author ?? "").trim();

  const rows = await listPages(book.id);
  const ready = rows.filter((row) => row.status === "ready" && row.image_path);
  if (rows.length === 0 || ready.length !== rows.length) throw new Error("pages_not_ready");

  const pictures = await Promise.all(
    ready.map(async (row) => {
      const bytes = await downloadCoverArt(row.image_path!);
      if (!bytes) throw new Error(`page ${row.position + 1} missing from storage`);
      return bytes;
    }),
  );

  const [digital, print] = await Promise.all([
    renderColoringPdf({ title, subtitle, author, pages: pictures, cover: input.cover, variant: "digital", blankVersos }),
    renderColoringPdf({ title, subtitle, author, pages: pictures, cover: null, variant: "print", blankVersos }),
  ]);
  const hasInterior = print.pages >= KDP_MIN_INTERIOR_PAGES || Boolean(input.ignoreMinimum);
  const ageLabel = settings && settings !== "invalid" ? ageBandLabel(settings.ageBand) : null;
  /* The print cover: dimensions from KDP's arithmetic for this exact
     interior, never guessed; the wrap draws whatever it is handed. */
  const printCover =
    hasInterior && input.cover
      ? await renderCoverWrap({
          front: input.cover,
          title,
          subtitle,
          author,
          description: [
            `A coloring book of ${pictures.length} pictures${ageLabel ? `, for ages ${ageLabel}` : ""}.`,
            "Bold black lines on white, one picture per page, 8.5 × 11 inches.",
          ],
          dimensions: kdpCoverDimensions({ pageCount: print.pages, trimWidth: 8.5, trimHeight: 11, paper: "white" }),
        })
      : null;
  const coverName = input.cover ? (input.cover.type === "png" ? "cover.png" : "cover.jpg") : null;

  const root = folderName(title);
  const zip = new JSZip();
  const put = (path: string, data: Buffer | string) => zip.file(`${root}/${path}`, data);
  const cover = (folder: string) => {
    if (input.cover && coverName) put(`${folder}/${coverName}`, input.cover.data);
  };
  const pagesInto = (folder: string) => {
    pictures.forEach((bytes, index) => put(`${folder}/pages/${String(index + 1).padStart(2, "0")}.png`, bytes));
  };

  put(
    "READ-ME.txt",
    readMe({ title, author, pictures: pictures.length, interiorPages: print.pages, hasInterior, coverName, blankVersos }),
  );
  if (hasInterior) put("Amazon KDP/paperback-interior.pdf", print.file);
  if (printCover) put("Amazon KDP/paperback-cover.pdf", printCover);
  cover("Amazon KDP");
  for (const folder of ["Etsy", "Gumroad", "Your own site"]) {
    put(`${folder}/printable.pdf`, digital.file);
    cover(folder);
    pagesInto(folder);
  }

  const file = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { file, name: `${slugOf(title)}-coloring-pack.zip`, pages: digital.pages };
}
