import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme } from "@/lib/book-design";
import { bookDocumentFrom, loadCover } from "@/lib/export/document";
import { DOCX_MIME, docxFileName, renderDocx } from "@/lib/export/docx";
import { EPUB_MIME, epubFileName, renderEpub } from "@/lib/export/epub";
import { PDF_MIME, pdfFileName, renderPdf } from "@/lib/export/pdf";
import { PACK_MIME, packFileName, renderPack } from "@/lib/export/pack";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

/* A cold Chromium plus two PDFs of a long book: minutes, not seconds. Same
   ceiling as the generate route; lower it if a deploy is refused. */
export const maxDuration = 300;

const FORMATS = ["pack", "docx", "pdf", "epub"] as const;
type Format = (typeof FORMATS)[number];

function isFormat(value: unknown): value is Format {
  return typeof value === "string" && (FORMATS as readonly string[]).includes(value);
}

/**
 * POST { format } → the book as a file.
 *
 * Same door as every book route: the origin is ours, the user is signed in,
 * and the book is theirs, or it is "not found". No free/paid gate yet; that
 * comes with the pricing screen. DOCX is built from the document model;
 * PDF is the Preview's own pages, printed by a headless browser from the
 * token-protected print page. EPUB is reflowable XHTML from the model.
 */
export async function POST(request: Request, { params }: Params) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // An empty body means the default format.
  }
  const input = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
  const wanted = "format" in input ? input.format : "pack";
  if (!isFormat(wanted)) {
    return NextResponse.json({ error: "format_not_available" }, { status: 400 });
  }
  const variant = input.variant === "print" ? "print" : "digital";

  const [chapters, cover] = await Promise.all([listChapters(book.id), loadCover(book)]);
  const document = bookDocumentFrom(book, chapters, cover);
  if (document.chapters.length === 0) {
    return NextResponse.json({ error: "nothing_to_export" }, { status: 409 });
  }

  let file: Buffer;
  let name: string;
  let mime: string;
  let pages: number | null = null;
  if (wanted === "pack") {
    try {
      const pack = await renderPack({ origin: new URL(request.url).origin, document, book, userId });
      file = pack.file;
      pages = pack.pages;
    } catch (error) {
      console.error("pack export failed", error);
      return NextResponse.json({ error: "pack_failed" }, { status: 502 });
    }
    name = packFileName(document.meta.title);
    mime = PACK_MIME;
  } else if (wanted === "pdf") {
    try {
      const pdf = await renderPdf({ origin: new URL(request.url).origin, bookId: book.id, userId, variant });
      file = pdf.file;
      pages = pdf.pages;
    } catch (error) {
      console.error("pdf export failed", error);
      return NextResponse.json({ error: "pdf_failed" }, { status: 502 });
    }
    name = pdfFileName(document.meta.title, variant === "print" ? "kdp-interior" : undefined);
    mime = PDF_MIME;
  } else if (wanted === "epub") {
    const { design, theme } = resolveTheme(book.format_slug, book.theme, book.id);
    file = await renderEpub(document, design, theme);
    name = epubFileName(document.meta.title);
    mime = EPUB_MIME;
  } else {
    const { design, theme } = resolveTheme(book.format_slug, book.theme, book.id);
    file = await renderDocx(document, design, theme);
    name = docxFileName(document.meta.title);
    mime = DOCX_MIME;
  }

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(file.byteLength),
      /* Plain ASCII name for old clients, UTF-8 name for the rest. */
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      ...(pages != null ? { "X-Book-Pages": String(pages) } : {}),
    },
  });
}
