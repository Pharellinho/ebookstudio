import "server-only";
import JSZip from "jszip";
import { resolveTheme } from "@/lib/book-design";
import type { BookRow } from "@/lib/books";
import type { BookDocument } from "@/lib/export/document";
import { renderDocx } from "@/lib/export/docx";
import { renderEpub } from "@/lib/export/epub";
import { renderPdfs } from "@/lib/export/pdf";
import { renderCoverWrap } from "@/lib/export/cover-wrap";
import { kdpCoverDimensions } from "@/lib/print/kdp";

/**
 * The book pack: one download, one folder per platform, and in each
 * folder exactly the files that platform takes — nothing to figure out.
 *
 *   <title>/
 *     READ-ME.txt
 *     Amazon KDP/          ebook-manuscript.epub, paperback-interior.pdf, paperback-cover.pdf, cover.jpg
 *     Apple Books/         book.epub, cover.jpg
 *     Kobo/                book.epub, cover.jpg
 *     Etsy/                book.pdf, cover.jpg
 *     Gumroad/             book.pdf, book.epub, cover.jpg
 *     Your own site/       book.pdf, book.epub, cover.jpg
 *     Editable/            book.docx
 *
 * The paperback interior is included only when the book reaches KDP's
 * minimum of 24 interior pages; the READ-ME says so when it is missing.
 */

export const PACK_MIME = "application/zip";

/** KDP does not print anything shorter. */
export const KDP_MIN_INTERIOR_PAGES = 24;

function slugOf(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "book"
  );
}

export function packFileName(title: string): string {
  return `${slugOf(title)}-book-pack.zip`;
}

/** Folder-safe version of the title, for the top folder inside the zip. */
function folderName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Book";
}

function readMe(doc: BookDocument, coverName: string | null, interiorPages: number, hasInterior: boolean): string {
  const cover = coverName ?? "cover.jpg";
  const lines = [
    `${doc.meta.title}${doc.meta.subtitle ? ` — ${doc.meta.subtitle}` : ""}`,
    doc.meta.author ? `by ${doc.meta.author}` : "",
    "",
    "Your book, ready for each store. Open the folder of the platform you are",
    "publishing on and upload the files it contains.",
    "",
    "Amazon KDP",
    "  ebook-manuscript.epub   Upload as the manuscript of the Kindle eBook.",
    hasInterior
      ? `  paperback-interior.pdf  Upload as the manuscript of the paperback (6 x 9 in, ${interiorPages} pages, fonts embedded, gutter included). KDP builds the wrap-around print cover from ${cover} with its Cover Creator.`
      : `  (no paperback interior)  KDP prints books of ${KDP_MIN_INTERIOR_PAGES} pages or more; this one has ${interiorPages}. Add chapters and export again for a paperback.`,
    hasInterior && coverName
      ? "  paperback-cover.pdf     The full print cover: back, spine and front, with bleed, sized by KDP's own calculator for this page count on white paper. Upload it as the paperback's cover."
      : "",
    coverName ? `  ${cover.padEnd(23)} Upload as the eBook cover.` : "  (no cover yet)          Generate one in the studio's Cover tab.",
    "",
    "Apple Books / Kobo",
    `  book.epub               The eBook. ${cover} is the store cover.`,
    "",
    "Etsy / Gumroad / Your own site",
    "  book.pdf                The digital book, cover on page 1, to sell as a file.",
    "  book.epub               For buyers who read on a phone or an e-reader (Gumroad, your site).",
    "",
    "Editable",
    "  book.docx               The manuscript in Word, to keep editing or hand to a designer.",
    "",
    "The copyright page states that the book was written with the assistance of",
    "AI and reviewed by the author; KDP asks you to declare that at upload too.",
    "",
    "Made with EbookStudio.",
  ];
  return lines.filter((line) => line !== undefined).join("\n") + "\n";
}

export async function renderPack(input: {
  origin: string;
  document: BookDocument;
  book: BookRow;
  userId: string;
}): Promise<{ file: Buffer; pages: number; files: string[] }> {
  const { document: doc, book } = input;
  const { design, theme } = resolveTheme(book.format_slug, book.theme, book.id);

  /* Text formats first (cheap), then the two PDFs from one browser. */
  const [docx, epub, pdfs] = await Promise.all([
    renderDocx(doc, design, theme),
    renderEpub(doc, design, theme),
    renderPdfs({ origin: input.origin, bookId: book.id, userId: input.userId, variants: ["digital", "print"] }),
  ]);
  const digital = pdfs.digital;
  const print = pdfs.print;
  if (!digital) throw new Error("digital PDF missing");
  const interiorPages = print?.pages ?? 0;
  const hasInterior = Boolean(print) && interiorPages >= KDP_MIN_INTERIOR_PAGES;

  const coverName = doc.cover ? (doc.cover.type === "png" ? "cover.png" : "cover.jpg") : null;
  /* The paperback's wrap, sized by KDP's arithmetic for this interior. */
  const printCover =
    hasInterior && doc.cover && print
      ? await renderCoverWrap({
          front: doc.cover,
          title: doc.meta.title,
          subtitle: doc.meta.subtitle,
          author: doc.meta.author,
          description: [],
          dimensions: kdpCoverDimensions({ pageCount: print.pages, trimWidth: 6, trimHeight: 9, paper: "white" }),
        })
      : null;
  const root = folderName(doc.meta.title);
  const zip = new JSZip();
  const files: string[] = [];
  const put = (path: string, data: Buffer | string) => {
    zip.file(`${root}/${path}`, data);
    files.push(path);
  };
  const cover = (folder: string) => {
    if (doc.cover && coverName) put(`${folder}/${coverName}`, doc.cover.data);
  };

  put("READ-ME.txt", readMe(doc, coverName, interiorPages, hasInterior));

  put("Amazon KDP/ebook-manuscript.epub", epub);
  if (hasInterior && print) put("Amazon KDP/paperback-interior.pdf", print.file);
  if (printCover) put("Amazon KDP/paperback-cover.pdf", printCover);
  cover("Amazon KDP");

  put("Apple Books/book.epub", epub);
  cover("Apple Books");

  put("Kobo/book.epub", epub);
  cover("Kobo");

  put("Etsy/book.pdf", digital.file);
  cover("Etsy");

  put("Gumroad/book.pdf", digital.file);
  put("Gumroad/book.epub", epub);
  cover("Gumroad");

  put("Your own site/book.pdf", digital.file);
  put("Your own site/book.epub", epub);
  cover("Your own site");

  put("Editable/book.docx", docx);

  const file = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { file, pages: digital.pages, files };
}
