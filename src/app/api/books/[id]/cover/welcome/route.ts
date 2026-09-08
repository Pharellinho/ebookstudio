import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getBookForUser, updateBook } from "@/lib/books";
import { COVER_AUTHOR_MAX, type CoverCandidate } from "@/lib/cover-rules";
import { signCoverArt, uploadCoverArt } from "@/lib/covers";
import {
  coverBrief,
  coverDirections,
  coverPrompt,
  fallbackCoverBrief,
  generateCover,
  welcomeDirectionIndex,
} from "@/lib/generation/cover-art";
import { openaiConfigured } from "@/lib/generation/openai";
import { getFormat } from "@/lib/generation/prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

/* One brief and one image: well under two minutes. */
export const maxDuration = 120;

/**
 * POST → { candidate, chosen }
 *
 * The welcome cover: ONE cover drawn while the chapters are being written,
 * in the direction that suits the subject's register. It needs nothing but
 * the outline, so the client fires it the moment the book exists, in a
 * request of its own — the chapters never wait for it and it never waits
 * for them. It is a gift: it does not spend one of the book's cover runs.
 * Calling it again returns the same cover instead of drawing another.
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

  // Already drawn: hand it back, free.
  const existing = (book.cover_candidates ?? []).find((candidate) => candidate.welcome);
  if (existing) {
    return NextResponse.json({
      candidate: { ...existing, url: await signCoverArt(existing.path) },
      chosen: book.cover_url ?? null,
      reused: true,
    });
  }

  if (!openaiConfigured()) {
    return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
  }

  const format = getFormat(book.format_slug);
  if (!format) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  /* Two windows: a per-book one so a retried or doubled request cannot draw
     the gift twice, and a per-user one so it stays a gift. Neither touches
     the cover-run counter the studio's "Generate 3 covers" spends. */
  const perBook = await checkRateLimit(`books:cover-welcome:${book.id}`, {
    limit: 2,
    windowMs: 10 * 60 * 1000,
  });
  if (!perBook.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const perUser = await checkRateLimit(`books:cover-welcome:${userId}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!perUser.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  /* Nobody has typed an author name at this point, so the signed-in name
     is drawn, and remembered so the Cover tab starts with it. A user with
     no name gets a cover without one rather than a made-up name. */
  let author = (book.cover_author ?? "").trim();
  if (!author) {
    const user = await currentUser().catch(() => null);
    author = (user?.fullName ?? user?.firstName ?? "").trim().slice(0, COVER_AUTHOR_MAX);
    if (author) await updateBook(book.id, { cover_author: author });
  }

  const title = book.title ?? book.outline?.title ?? "Untitled";

  let brief: Awaited<ReturnType<typeof coverBrief>>;
  try {
    brief = await coverBrief({
      title,
      subtitle: book.subtitle,
      idea: book.idea,
      chapterTitles: (book.outline?.chapters ?? []).map((chapter) => chapter.title),
    });
  } catch (error) {
    console.error("welcome cover brief failed", error);
    brief = fallbackCoverBrief({ idea: book.idea, subtitle: book.subtitle });
  }

  const index = welcomeDirectionIndex(brief);
  const direction = coverDirections(brief)[index];
  const prompt = coverPrompt({
    title,
    author,
    idea: book.idea,
    format,
    brief,
    directionIndex: index,
  });

  let candidate: CoverCandidate;
  try {
    const png = await generateCover(prompt, `welcome ${brief.register}/${direction.id}`);
    const path = await uploadCoverArt(userId, book.id, png);
    candidate = {
      path,
      createdAt: new Date().toISOString(),
      variant: `${brief.register}/${direction.id}`,
      title,
      welcome: true,
    };
  } catch (error) {
    console.error("welcome cover failed", error);
    return NextResponse.json({ error: "cover_failed" }, { status: 502 });
  }

  /* Re-read before writing: a cover run may have landed while we drew. */
  const latest = await getBookForUser(book.id, userId);
  const candidates = [...(latest?.cover_candidates ?? []), candidate];
  const chosen = latest?.cover_url ?? candidate.path;
  await updateBook(book.id, { cover_candidates: candidates, cover_url: chosen });

  return NextResponse.json({
    candidate: { ...candidate, url: await signCoverArt(candidate.path) },
    chosen,
    reused: false,
  });
}
