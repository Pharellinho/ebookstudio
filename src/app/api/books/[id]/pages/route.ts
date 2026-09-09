import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser } from "@/lib/books";
import { listPages, syncPages, type ColoringPageRow } from "@/lib/coloring-pages";
import { signCoverArt } from "@/lib/covers";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

export type ColoringPageView = Omit<ColoringPageRow, "book_id"> & { url: string | null };

async function withUrls(rows: ColoringPageRow[]): Promise<ColoringPageView[]> {
  return Promise.all(
    rows.map(async ({ book_id: _book, ...row }) => ({ ...row, url: await signCoverArt(row.image_path) })),
  );
}

/** GET → { pages } the pages of a coloring book, with fresh picture URLs. */
export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    return NextResponse.json({ pages: await withUrls(await listPages(book.id)) });
  } catch (error) {
    if (error instanceof Error && error.message === "pages_table_missing") {
      return NextResponse.json({ error: "pages_table_missing" }, { status: 503 });
    }
    throw error;
  }
}

/**
 * POST → { pages }
 * Makes the page rows match the saved plan, so drawing can start or resume.
 * Free: no model is called here.
 */
export async function POST(request: Request, { params }: Params) {
  if (!originAllowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (book.format_slug !== "coloring-book") {
    return NextResponse.json({ error: "not_a_coloring_book" }, { status: 400 });
  }
  const scenes = (book.outline?.chapters ?? []).map((chapter) => ({ scene: chapter.title, detail: chapter.summary }));
  if (scenes.length === 0) return NextResponse.json({ error: "no_plan" }, { status: 409 });

  try {
    return NextResponse.json({ pages: await withUrls(await syncPages(book.id, scenes)) });
  } catch (error) {
    if (error instanceof Error && error.message === "pages_table_missing") {
      return NextResponse.json({ error: "pages_table_missing" }, { status: 503 });
    }
    throw error;
  }
}
