import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteBookForUser, getBookForUser, listChapters, updateBook } from "@/lib/books";
import { resolveTheme, themesForFormat } from "@/lib/book-design";
import { isCoverLayout } from "@/lib/cover-layouts";
import { site } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

/* Same definition of "still running" as the generate route: a book that has
   not been touched for this long is a dead run, and deleting it is safe. */
const STALE_AFTER_MS = 5 * 60 * 1000;

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const isProd =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!origin) {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }

  const allowed = new Set(
    [
      site.url,
      `https://${site.domain}`,
      `https://www.${site.domain}`,
      ...(!isProd
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ].map((value) => value.replace(/\/$/, "")),
  );

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

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
      accent: book.accent ?? null,
      theme: resolveTheme(book.format_slug, book.theme, book.id).theme.id,
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

export async function DELETE(request: Request, { params }: Params) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Ownership is the check that matters: someone else's book is "not found".
  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  /* A generation in flight would keep writing into rows that no longer
     exist. The client has to stop it first. */
  const running = book.status === "outlining" || book.status === "writing";
  const lastTouch = Date.parse(book.updated_at);
  const stalled =
    !Number.isFinite(lastTouch) || Date.now() - lastTouch > STALE_AFTER_MS;
  if (running && !stalled) {
    return NextResponse.json({ error: "generating" }, { status: 409 });
  }

  const deleted = await deleteBookForUser(book.id, userId);
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: book.id });
}

/**
 * PATCH { theme?, title?, subtitle?, cover_layout?, cover_author? }
 * Cheap, text-only edits the studio makes while the author types. None of
 * them touch a model. The accent column follows the theme so anything that
 * reads only `accent` stays right.
 */
export async function PATCH(request: Request, { params }: Params) {
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
  const input =
    typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};

  const patch: Parameters<typeof updateBook>[1] = {};
  const echo: Record<string, unknown> = {};

  if (input.theme !== undefined) {
    const theme = themesForFormat(book.format_slug).find((item) => item.id === input.theme);
    if (!theme) return NextResponse.json({ error: "invalid_theme" }, { status: 400 });
    patch.theme = theme.id;
    patch.accent = theme.accent;
    echo.theme = theme.id;
    echo.accent = theme.accent;
  }
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 200) {
      return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    }
    patch.title = input.title.trim();
    echo.title = patch.title;
  }
  if (input.subtitle !== undefined) {
    if (typeof input.subtitle !== "string" || input.subtitle.length > 300) {
      return NextResponse.json({ error: "invalid_subtitle" }, { status: 400 });
    }
    patch.subtitle = input.subtitle.trim() || null;
    echo.subtitle = patch.subtitle;
  }
  if (input.cover_layout !== undefined) {
    if (!isCoverLayout(input.cover_layout)) {
      return NextResponse.json({ error: "invalid_layout" }, { status: 400 });
    }
    patch.cover_layout = input.cover_layout;
    echo.cover_layout = input.cover_layout;
  }
  if (input.cover_author !== undefined) {
    if (typeof input.cover_author !== "string" || input.cover_author.length > 80) {
      return NextResponse.json({ error: "invalid_author" }, { status: 400 });
    }
    patch.cover_author = input.cover_author.trim() || null;
    echo.cover_author = patch.cover_author;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  try {
    await updateBook(book.id, patch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/theme|accent|cover_/i.test(message)) {
      // The matching migration (0008, 0009 or 0010) has not been applied yet.
      return NextResponse.json({ error: "column_missing" }, { status: 503 });
    }
    throw error;
  }

  return NextResponse.json(echo);
}
