import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, getChapter, updateChapter } from "@/lib/books";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string; chapterId: string }> };

/* A chapter is a few thousand words. This is far above any real chapter and
   far below anything that would strain the database or the editor. */
export const CHAPTER_BODY_MAX = 200_000;

/* Same definition of "still running" as the generate route: a book that has
   not been touched for this long is a dead run, and editing it is safe. */
const STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * PATCH { body: string } → { updatedAt }
 *
 * Saves the chapter markdown the studio editor produced. Ownership is the
 * check that matters: a book you do not own, or a chapter that is not in
 * that book, is "not found".
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, chapterId } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const chapter = await getChapter(chapterId);
  if (!chapter || chapter.book_id !== book.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  /* Scribe is still writing this book: a manual save now would race the
     generator and one of the two would be lost. */
  const running = book.status === "outlining" || book.status === "writing";
  const lastTouch = Date.parse(book.updated_at);
  const stalled =
    !Number.isFinite(lastTouch) || Date.now() - lastTouch > STALE_AFTER_MS;
  if (running && !stalled) {
    return NextResponse.json({ error: "generating" }, { status: 409 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body =
    typeof payload === "object" && payload && "body" in payload
      ? (payload as { body: unknown }).body
      : undefined;
  if (typeof body !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.length > CHAPTER_BODY_MAX) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  const updatedAt = new Date().toISOString();
  await updateChapter(chapter.id, { body });

  return NextResponse.json({ updatedAt });
}
