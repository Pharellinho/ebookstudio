import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createBook } from "@/lib/books";
import { getFormat } from "@/lib/generation/prompts";
import { ensureProfile } from "@/lib/auth/profile";
import { currentUser } from "@clerk/nextjs/server";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { site } from "@/lib/site";

const CREATE_LIMIT = 20;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

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
  const outline =
    typeof body === "object" && body && "outline" in body
      ? (body as { outline: unknown }).outline
      : null;

  try {
    const book = await createBook({
      userId,
      idea,
      formatSlug,
      title,
      subtitle,
      outline:
        outline && typeof outline === "object"
          ? (outline as Parameters<typeof createBook>[0]["outline"])
          : null,
      status: outline ? "draft" : "draft",
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
