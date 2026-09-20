import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, updateBook } from "@/lib/books";
import { originAllowed } from "@/lib/request-origin";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

/* No model behind this route, one database write: generous, but not
   unbounded, so a script cannot hammer the books table. */
const CHOOSE_LIMIT = 60;
const CHOOSE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { path } → { chosen }
 * Picks one of the book's generated covers as its cover. Free: no model.
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

  const rate = await checkRateLimit(`books:cover-choose:${userId}`, { limit: CHOOSE_LIMIT, windowMs: CHOOSE_WINDOW_MS });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const path =
    typeof payload === "object" && payload && "path" in payload
      ? (payload as { path: unknown }).path
      : undefined;

  // Only a cover this book generated can become this book's cover.
  const known = (book.cover_candidates ?? []).some((candidate) => candidate.path === path);
  if (typeof path !== "string" || !known) {
    return NextResponse.json({ error: "invalid_cover" }, { status: 400 });
  }

  await updateBook(book.id, { cover_url: path });
  return NextResponse.json({ chosen: path });
}
