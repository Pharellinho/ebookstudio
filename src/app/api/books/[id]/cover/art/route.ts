import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, reserveCoverArtSlot, updateBook } from "@/lib/books";
import { COVER_ART_CAP, COVER_DIRECTION_MAX } from "@/lib/cover-layouts";
import { signCoverArt, uploadCoverArt } from "@/lib/covers";
import { coverArtPrompt, generateCoverArt } from "@/lib/generation/cover-art";
import { openaiConfigured } from "@/lib/generation/openai";
import { getFormat } from "@/lib/generation/prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string }> };

/* One image call; the model answers well inside a minute. */
export const maxDuration = 60;

const ART_LIMIT = 10;
const ART_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { direction? } → { artUrl, artCount, remaining }
 *
 * Generates ONE illustration — never any text — and stores it in the private
 * covers bucket. The prompt is ours; the author only adds a short direction.
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

  /* The strict cap: five illustrations for the life of the book. */
  const used = book.cover_art_count ?? 0;
  if (used >= COVER_ART_CAP) {
    return NextResponse.json(
      { error: "cover_cap", message: `This book has used all ${COVER_ART_CAP} illustrations.` },
      { status: 429 },
    );
  }

  const rate = await checkRateLimit(`books:cover-art:${userId}`, {
    limit: ART_LIMIT,
    windowMs: ART_WINDOW_MS,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // An empty body is fine: the direction is optional.
  }
  const rawDirection =
    typeof payload === "object" && payload && "direction" in payload
      ? (payload as { direction: unknown }).direction
      : undefined;
  if (rawDirection !== undefined && typeof rawDirection !== "string") {
    return NextResponse.json({ error: "invalid_direction" }, { status: 400 });
  }
  if (typeof rawDirection === "string" && rawDirection.length > COVER_DIRECTION_MAX) {
    return NextResponse.json({ error: "direction_too_long" }, { status: 400 });
  }

  /* The slot is spent BEFORE the model is called. A request that dies after
     this point has still used one of its five — otherwise a dropped
     connection would be a way around the cap. */
  let reserved: boolean;
  try {
    reserved = await reserveCoverArtSlot(book.id, used, COVER_ART_CAP);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cover_art_count/i.test(message)) {
      return NextResponse.json({ error: "cover_columns_missing" }, { status: 503 });
    }
    throw error;
  }
  if (!reserved) {
    return NextResponse.json(
      { error: "cover_cap", message: `This book has used all ${COVER_ART_CAP} illustrations.` },
      { status: 429 },
    );
  }
  const artCount = used + 1;

  const prompt = coverArtPrompt({
    title: book.title ?? book.outline?.title ?? "Untitled",
    idea: book.idea,
    format,
    direction: rawDirection,
  });

  let png: Buffer;
  try {
    png = await generateCoverArt(prompt);
  } catch (error) {
    console.error("cover art failed", error);
    return NextResponse.json(
      { error: "art_failed", artCount, remaining: COVER_ART_CAP - artCount },
      { status: 502 },
    );
  }

  const path = await uploadCoverArt(userId, book.id, png);
  await updateBook(book.id, { cover_art_url: path });
  const artUrl = await signCoverArt(path);

  return NextResponse.json({ artUrl, artCount, remaining: COVER_ART_CAP - artCount });
}
