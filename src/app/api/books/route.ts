import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { countBooksForUser, createBook } from "@/lib/books";
import { planAllowsAnotherBook, planAllowsColoring } from "@/lib/billing/plans";
import { parseOutline } from "@/lib/outline";
import { parseColoringSettings } from "@/lib/coloring";
import { COVER_AUTHOR_MAX } from "@/lib/cover-rules";
import {
  getFormat,

} from "@/lib/generation/prompts";
import { ensureProfile } from "@/lib/auth/profile";
import { currentUser } from "@clerk/nextjs/server";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { originAllowed } from "@/lib/request-origin";

const CREATE_LIMIT = 20;
const CREATE_WINDOW_MS = 60 * 60 * 1000;



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
  const authorRaw =
    typeof body === "object" && body && "author" in body && typeof (body as { author: unknown }).author === "string"
      ? (body as { author: string }).author.trim()
      : "";
  if (authorRaw.length > COVER_AUTHOR_MAX) {
    return NextResponse.json({ error: "invalid_author" }, { status: 400 });
  }
  const outline = parseOutline(
    typeof body === "object" && body && "outline" in body
      ? (body as { outline: unknown }).outline
      : null,
  );
  if (outline === "invalid") {
    return NextResponse.json({ error: "invalid_outline" }, { status: 400 });
  }
  const settings = parseColoringSettings(
    typeof body === "object" && body && "settings" in body ? (body as { settings: unknown }).settings : null,
  );
  if (settings === "invalid") {
    return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  }

  /* The free plan holds one book, and the coloring studio comes with a plan. */
  if (formatSlug === "coloring-book" && !planAllowsColoring(profile.billing.plan)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
  }
  if (!planAllowsAnotherBook(profile.billing.plan, await countBooksForUser(userId))) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
  }

  try {
    const book = await createBook({
      userId,
      idea,
      formatSlug,
      title,
      subtitle,
      outline,
      coverAuthor: authorRaw || null,
      settings,
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
