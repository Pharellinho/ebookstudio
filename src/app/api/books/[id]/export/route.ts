import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme } from "@/lib/book-design";
import { bookDocumentFrom, loadCover } from "@/lib/export/document";
import { DOCX_MIME, docxFileName, renderDocx } from "@/lib/export/docx";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 60;

const FORMATS = ["docx"] as const;
type Format = (typeof FORMATS)[number];

function isFormat(value: unknown): value is Format {
  return typeof value === "string" && (FORMATS as readonly string[]).includes(value);
}

/**
 * POST { format } → the book as a file.
 *
 * Same door as every book route: the origin is ours, the user is signed in,
 * and the book is theirs, or it is "not found". No free/paid gate yet; that
 * comes with the pricing screen. Only DOCX exists today; EPUB and PDF will
 * take the same document and the same door.
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
  const wanted =
    typeof payload === "object" && payload && "format" in payload
      ? (payload as { format: unknown }).format
      : "docx";
  if (!isFormat(wanted)) {
    return NextResponse.json({ error: "format_not_available" }, { status: 400 });
  }

  const [chapters, cover] = await Promise.all([listChapters(book.id), loadCover(book)]);
  const document = bookDocumentFrom(book, chapters, cover);
  if (document.chapters.length === 0) {
    return NextResponse.json({ error: "nothing_to_export" }, { status: 409 });
  }

  const { design, theme } = resolveTheme(book.format_slug, book.theme, book.id);
  const file = await renderDocx(document, design, theme);
  const name = docxFileName(document.meta.title);

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(file.byteLength),
      /* Plain ASCII name for old clients, UTF-8 name for the rest. */
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
