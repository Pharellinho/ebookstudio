import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, listChapters } from "@/lib/books";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const chapters = await listChapters(book.id);

  return NextResponse.json({
    book: {
      id: book.id,
      idea: book.idea,
      formatSlug: book.format_slug,
      title: book.title,
      subtitle: book.subtitle,
      status: book.status,
      outline: book.outline,
      coverUrl: book.cover_url,
      error: book.error,
    },
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title,
      body: chapter.body,
      status: chapter.status,
    })),
  });
}
