import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createBook } from "@/lib/books";
import {
  getFormat,
  MAX_OUTLINE_CHAPTERS,
  type BookOutline,
} from "@/lib/generation/prompts";
import { ensureProfile } from "@/lib/auth/profile";
import { currentUser } from "@clerk/nextjs/server";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { originAllowed } from "@/lib/request-origin";

const CREATE_LIMIT = 20;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

const MAX_TITLE_LENGTH = 300;
const MAX_SUMMARY_LENGTH = 2000;

/**
 * The outline a client sends decides how many OpenAI calls the generate route
 * will later make, so it is a bill, not just display data. Anything that is not
 * a well-formed outline within bounds is refused rather than trimmed, so a
 * caller never quietly gets a different book than the one it asked for.
 */
function parseOutline(value: unknown): BookOutline | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";

  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const subtitle = typeof raw.subtitle === "string" ? raw.subtitle.trim() : "";

  if (!title || title.length > MAX_TITLE_LENGTH) return "invalid";
  if (subtitle.length > MAX_TITLE_LENGTH) return "invalid";
  if (!Array.isArray(raw.chapters)) return "invalid";
  if (raw.chapters.length < 1 || raw.chapters.length > MAX_OUTLINE_CHAPTERS) {
    return "invalid";
  }

  const chapters: BookOutline["chapters"] = [];
  for (const entry of raw.chapters) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return "invalid";
    }
    const chapter = entry as Record<string, unknown>;
    const chapterTitle =
      typeof chapter.title === "string" ? chapter.title.trim() : "";
    const summary =
      typeof chapter.summary === "string" ? chapter.summary.trim() : "";

    if (!chapterTitle || chapterTitle.length > MAX_TITLE_LENGTH) {
      return "invalid";
    }
    if (summary.length > MAX_SUMMARY_LENGTH) return "invalid";

    chapters.push({ title: chapterTitle, summary });
  }

  return { title, subtitle, chapters };
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;
  if (!email || !user) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const profile = await ensureProfile({
    clerkUserId: userId,
    email,
    displayName: user.fullName ?? user.firstName ?? null,
    imageUrl: user.imageUrl ?? null,
  });
  if (!profile) {
    return NextResponse.json({ error: "profile_unavailable" }, { status: 503 });
  }

  const ipHash = hashIp(getClientIp(request));
  const rate = await checkRateLimit(`books:create:${userId}:${ipHash}`, {
    limit: CREATE_LIMIT,
    windowMs: CREATE_WINDOW_MS,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const idea =
    typeof body === "object" &&
    body &&
    "idea" in body &&
    typeof (body as { idea: unknown }).idea === "string"
      ? (body as { idea: string }).idea.trim()
      : "";
  const formatSlug =
    typeof body === "object" &&
    body &&
    "formatSlug" in body &&
    typeof (body as { formatSlug: unknown }).formatSlug === "string"
      ? (body as { formatSlug: string }).formatSlug.trim()
      : "";

  if (idea.length < 8 || idea.length > 1200) {
    return NextResponse.json({ error: "invalid_idea" }, { status: 400 });
  }
  if (!getFormat(formatSlug)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  const title =
    typeof body === "object" &&
    body &&
    "title" in body &&
    typeof (body as { title: unknown }).title === "string"
      ? (body as { title: string }).title.trim()
      : null;
  const subtitle =
    typeof body === "object" &&
    body &&
    "subtitle" in body &&
    typeof (body as { subtitle: unknown }).subtitle === "string"
      ? (body as { subtitle: string }).subtitle.trim()
      : null;
  const outline = parseOutline(
    typeof body === "object" && body && "outline" in body
      ? (body as { outline: unknown }).outline
      : null,
  );
  if (outline === "invalid") {
    return NextResponse.json({ error: "invalid_outline" }, { status: 400 });
  }

  try {
    const book = await createBook({
      userId,
      idea,
      formatSlug,
      title,
      subtitle,
      outline,
      status: "draft",
    });
    return NextResponse.json({
      ok: true,
      book: {
        id: book.id,
        idea: book.idea,
        formatSlug: book.format_slug,
        status: book.status,
      },
    });
  } catch (error) {
    console.error("create book failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
