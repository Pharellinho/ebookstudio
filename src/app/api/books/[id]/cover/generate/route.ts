import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, reserveCoverRun, updateBook } from "@/lib/books";
import {
  COVER_AUTHOR_MAX,
  COVER_RUN_CAP,
  COVERS_PER_RUN,
  type CoverCandidate,
} from "@/lib/cover-rules";
import { signCoverArt, uploadCoverArt } from "@/lib/covers";
import {
  DEV_SINGLE_VARIANT,
  coverBrief,
  coverDirections,
  coverPrompt,
  fallbackCoverBrief,
  generateCover,
  COVER_MIME,
} from "@/lib/generation/cover-art";
import { openaiConfigured } from "@/lib/generation/openai";
import { getFormat } from "@/lib/generation/prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

/* Three images drawn in parallel; each takes well under a minute. */
export const maxDuration = 120;

const RUN_LIMIT = 5;
const RUN_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { author } → { candidates, chosen, runs, remaining }
 *
 * One run = three complete covers, title and author drawn into the picture,
 * in three different directions. The run is spent before the model is
 * called, so a dropped connection cannot be a way around the cap.
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

  if (!openaiConfigured()) {
    return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
  }

  const format = getFormat(book.format_slug);
  if (!format) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  const runs = book.cover_runs ?? 0;
  if (runs >= COVER_RUN_CAP) {
    return NextResponse.json({ error: "cover_cap" }, { status: 429 });
  }

  const rate = await checkRateLimit(`books:cover-run:${userId}`, {
    limit: RUN_LIMIT,
    windowMs: RUN_WINDOW_MS,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // The body may be empty; the author name then comes from the book.
  }
  const input = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};

  const authorRaw = typeof input.author === "string" ? input.author.trim() : (book.cover_author ?? "");
  if (!authorRaw || authorRaw.length > COVER_AUTHOR_MAX) {
    return NextResponse.json({ error: "invalid_author" }, { status: 400 });
  }

  let reserved: boolean;
  try {
    reserved = await reserveCoverRun(book.id, runs, COVER_RUN_CAP);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cover_runs/i.test(message)) {
      return NextResponse.json({ error: "cover_columns_missing" }, { status: 503 });
    }
    throw error;
  }
  if (!reserved) {
    return NextResponse.json({ error: "cover_cap" }, { status: 429 });
  }
  const runsNow = runs + 1;

  // The author name typed here is the one drawn on the cover: remember it.
  if (authorRaw !== (book.cover_author ?? "")) {
    await updateBook(book.id, { cover_author: authorRaw });
  }

  const title = book.title ?? book.outline?.title ?? "Untitled";

  /* One cheap text call turns the idea into a world the image model can
     draw: motifs, palette, mood. If it fails, the covers still get made
     from the idea alone. */
  let brief: Awaited<ReturnType<typeof coverBrief>>;
  try {
    brief = await coverBrief({
      title,
      subtitle: book.subtitle,
      idea: book.idea,
      chapterTitles: (book.outline?.chapters ?? []).map((chapter) => chapter.title),
    });
  } catch (error) {
    console.error("cover brief failed", error);
    brief = fallbackCoverBrief({ idea: book.idea, subtitle: book.subtitle });
  }

  const directions = coverDirections(brief);
  const results = await Promise.allSettled(
    ([0, 1, 2] as const).slice(0, DEV_SINGLE_VARIANT ? 1 : COVERS_PER_RUN).map(async (index): Promise<CoverCandidate> => {
      const prompt = coverPrompt({
        title,
        author: authorRaw,
        idea: book.idea,
        format,
        brief,
        directionIndex: index,
      });
      const variant = `${brief.register}/${directions[index].id}`;
      const picture = await generateCover(prompt, variant);
      const path = await uploadCoverArt(userId, book.id, picture, COVER_MIME);
      return { path, createdAt: new Date().toISOString(), variant, title };
    }),
  );

  const fresh = results
    .filter((r): r is PromiseFulfilledResult<CoverCandidate> => r.status === "fulfilled")
    .map((r) => r.value);
  for (const r of results) {
    if (r.status === "rejected") console.error("cover generation failed", r.reason);
  }

  if (fresh.length === 0) {
    return NextResponse.json(
      { error: "cover_failed", runs: runsNow, remaining: COVER_RUN_CAP - runsNow },
      { status: 502 },
    );
  }

  const candidates = [...(book.cover_candidates ?? []), ...fresh];
  await updateBook(book.id, { cover_candidates: candidates });
  // A book that had no cover gets the first of the run; the author can still pick another.
  const chosen = book.cover_url ?? fresh[0].path;
  if (!book.cover_url) await updateBook(book.id, { cover_url: chosen });

  const signed = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      url: await signCoverArt(candidate.path),
    })),
  );

  return NextResponse.json({
    candidates: signed,
    chosen,
    runs: runsNow,
    remaining: COVER_RUN_CAP - runsNow,
    partial: fresh.length < COVERS_PER_RUN,
  });
}
