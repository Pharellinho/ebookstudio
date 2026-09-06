import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openaiConfigured } from "@/lib/generation/openai";
import {
  planOutline,
  suggestFormat,
  suggestTitles,
} from "@/lib/generation/scribe";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";

const LIMIT = 40;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!openaiConfigured()) {
    return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
  }

  const rate = await checkRateLimit(`books:suggest:${userId}`, {
    limit: LIMIT,
    windowMs: WINDOW_MS,
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

  const action =
    typeof body === "object" &&
    body &&
    "action" in body &&
    typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : "";
  const idea =
    typeof body === "object" &&
    body &&
    "idea" in body &&
    typeof (body as { idea: unknown }).idea === "string"
      ? (body as { idea: string }).idea.trim()
      : "";

  if (idea.length < 8 || idea.length > 800) {
    return NextResponse.json({ error: "invalid_idea" }, { status: 400 });
  }

  try {
    if (action === "format") {
      const suggestion = await suggestFormat(idea);
      return NextResponse.json({ ok: true, ...suggestion });
    }

    if (action === "titles") {
      const formatSlug =
        typeof body === "object" &&
        body &&
        "formatSlug" in body &&
        typeof (body as { formatSlug: unknown }).formatSlug === "string"
          ? (body as { formatSlug: string }).formatSlug
          : "";
      const result = await suggestTitles({ idea, formatSlug });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "outline") {
      const formatSlug =
        typeof body === "object" &&
        body &&
        "formatSlug" in body &&
        typeof (body as { formatSlug: unknown }).formatSlug === "string"
          ? (body as { formatSlug: string }).formatSlug
          : "";
      const title =
        typeof body === "object" &&
        body &&
        "title" in body &&
        typeof (body as { title: unknown }).title === "string"
          ? (body as { title: string }).title.trim()
          : "";
      if (!title) {
        return NextResponse.json({ error: "invalid_title" }, { status: 400 });
      }
      const outline = await planOutline({ idea, formatSlug, title });
      return NextResponse.json({ ok: true, outline });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    console.error("suggest failed", error);
    return NextResponse.json({ error: "suggest_failed" }, { status: 500 });
  }
}
