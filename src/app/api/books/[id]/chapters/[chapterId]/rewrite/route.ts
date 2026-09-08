import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, getChapter, updateChapter } from "@/lib/books";
import { cleanModelText } from "@/lib/generation/clean";
import { openaiConfigured } from "@/lib/generation/openai";
import {
  getFormat,
  isRewriteAction,
  REWRITE_INSTRUCTION_MAX,
} from "@/lib/generation/prompts";
import { rewriteParagraph } from "@/lib/generation/rewrite";
import {
  hashText,
  issueUndoToken,
  readUndoToken,
} from "@/lib/generation/undo-token";
import { joinParagraphs, splitParagraphs } from "@/lib/paragraphs";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

type Params = { params: Promise<{ id: string; chapterId: string }> };

/* One paragraph, one model call: well inside the limit every plan allows. */
export const maxDuration = 60;

const REWRITE_LIMIT = 30;
const REWRITE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { paragraphIndex, action, instruction? }  → { body, edit }
 * POST { action: "undo", undoToken }             → { body }
 *
 * The client never sends chapter text. The paragraph is read from the
 * database, one paragraph is replaced, and the whole new body is returned so
 * the studio shows exactly what was saved.
 */
export async function POST(request: Request, { params }: Params) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Ownership is the check that matters: a book you do not own is not found.
  const { id, chapterId } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const chapter = await getChapter(chapterId);
  if (!chapter || chapter.book_id !== book.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const input =
    typeof body === "object" && body ? (body as Record<string, unknown>) : {};

  const paragraphs = splitParagraphs(chapter.body);

  /* ---- Undo: no model call, so no OpenAI check and no rate limit. ---- */
  if (input.action === "undo") {
    const token = typeof input.undoToken === "string" ? input.undoToken : "";
    const undo = readUndoToken(token);
    if (!undo || undo.userId !== userId || undo.chapterId !== chapter.id) {
      return NextResponse.json({ error: "invalid_undo" }, { status: 400 });
    }

    const current = paragraphs.slice(
      undo.paragraphIndex,
      undo.paragraphIndex + undo.replacedCount,
    );
    if (
      current.length !== undo.replacedCount ||
      hashText(joinParagraphs(current)) !== undo.replacementHash
    ) {
      // The paragraph moved on since this rewrite; restoring would clobber it.
      return NextResponse.json({ error: "undo_stale" }, { status: 409 });
    }

    const restored = [
      ...paragraphs.slice(0, undo.paragraphIndex),
      undo.previous,
      ...paragraphs.slice(undo.paragraphIndex + undo.replacedCount),
    ];
    const newBody = joinParagraphs(restored);
    await updateChapter(chapter.id, { body: newBody });
    return NextResponse.json({ body: newBody });
  }

  /* ---- Rewrite ---- */
  if (!openaiConfigured()) {
    return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
  }

  /* Counted only once the request is going to do real work, like the
     generate route: a 404 or a bad index must not cost an attempt. */
  const rate = await checkRateLimit(`books:rewrite:${userId}`, {
    limit: REWRITE_LIMIT,
    windowMs: REWRITE_WINDOW_MS,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const paragraphIndex = input.paragraphIndex;
  if (
    typeof paragraphIndex !== "number" ||
    !Number.isInteger(paragraphIndex) ||
    paragraphIndex < 0 ||
    paragraphIndex >= paragraphs.length
  ) {
    return NextResponse.json({ error: "invalid_paragraph" }, { status: 400 });
  }

  const action = input.action;
  if (!isRewriteAction(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  let instruction: string | undefined;
  if (action === "custom") {
    const raw = typeof input.instruction === "string" ? input.instruction.trim() : "";
    if (!raw || raw.length > REWRITE_INSTRUCTION_MAX) {
      return NextResponse.json({ error: "invalid_instruction" }, { status: 400 });
    }
    instruction = raw;
  }

  const format = getFormat(book.format_slug);
  if (!format) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  const outlineChapter = book.outline?.chapters?.[chapter.position];
  const paragraph = paragraphs[paragraphIndex];

  let replacement: string;
  try {
    replacement = await rewriteParagraph({
      format,
      bookTitle: book.title ?? book.outline?.title ?? "Untitled book",
      bookSubtitle: book.subtitle,
      chapterTitle: chapter.title,
      chapterSummary: outlineChapter?.summary ?? "",
      previous: paragraphIndex > 0 ? paragraphs[paragraphIndex - 1] : null,
      next:
        paragraphIndex < paragraphs.length - 1
          ? paragraphs[paragraphIndex + 1]
          : null,
      paragraph,
      action,
      instruction,
    });
  } catch (error) {
    console.error("rewrite failed", error);
    return NextResponse.json({ error: "rewrite_failed" }, { status: 502 });
  }

  /* "Expand" may legitimately come back as two paragraphs; keep them as
     separate blocks and remember how many took the original's place. */
  const replacementBlocks = splitParagraphs(cleanModelText(replacement));
  if (replacementBlocks.length === 0) {
    return NextResponse.json({ error: "rewrite_failed" }, { status: 502 });
  }

  const updated = [
    ...paragraphs.slice(0, paragraphIndex),
    ...replacementBlocks,
    ...paragraphs.slice(paragraphIndex + 1),
  ];
  const newBody = joinParagraphs(updated);
  await updateChapter(chapter.id, { body: newBody });

  const undoToken = issueUndoToken({
    userId,
    chapterId: chapter.id,
    paragraphIndex,
    replacedCount: replacementBlocks.length,
    replacementHash: hashText(joinParagraphs(replacementBlocks)),
    previous: paragraph,
  });

  return NextResponse.json({
    body: newBody,
    edit: {
      paragraphIndex,
      replacedCount: replacementBlocks.length,
      undoToken,
    },
  });
}
