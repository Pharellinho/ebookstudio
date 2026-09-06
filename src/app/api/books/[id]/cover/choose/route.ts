import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, updateBook } from "@/lib/books";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

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
