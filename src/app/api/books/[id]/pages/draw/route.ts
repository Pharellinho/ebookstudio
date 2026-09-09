import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, updateBook } from "@/lib/books";
import { parseColoringSettings } from "@/lib/coloring";
import {
  PAGE_REDRAW_CAP,
  allPagesReady,
  claimPage,
  getPage,
  updatePage,
  uploadPageArt,
} from "@/lib/coloring-pages";
import { signCoverArt } from "@/lib/covers";
import { drawColoringPage } from "@/lib/generation/coloring-art";
import { openaiConfigured } from "@/lib/generation/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";
import { planAllowsColoring } from "@/lib/billing/plans";
import { loadBilling } from "@/lib/billing/subscription";

type Params = { params: Promise<{ id: string }> };

/* One picture per call; the model takes well under two minutes. */
export const maxDuration = 300;

const LIMIT = 150;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * POST { position, redraw? } → { page }
 *
 * Draws one page of a coloring book. The client calls this once per page,
 * a few at a time. A page already drawn is handed back as is unless
 * `redraw` is asked, and each page can be redrawn a few times at most.
 */
export async function POST(request: Request, { params }: Params) {
  if (!originAllowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const settings = parseColoringSettings(book.settings ?? null);
  if (!settings || settings === "invalid") {
    return NextResponse.json({ error: "no_settings" }, { status: 409 });
  }
  if (!openaiConfigured()) return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
  if (!planAllowsColoring((await loadBilling(userId)).plan)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const input = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
  const position = Number(input.position);
  const redraw = input.redraw === true;
  if (!Number.isInteger(position) || position < 0) {
    return NextResponse.json({ error: "invalid_position" }, { status: 400 });
  }

  const page = await getPage(book.id, position);
  if (!page) return NextResponse.json({ error: "page_not_found" }, { status: 404 });

  if (page.status === "ready" && !redraw && !page.stale) {
    return NextResponse.json({ page: { ...page, url: await signCoverArt(page.image_path) } });
  }
  if (redraw && page.redraws >= PAGE_REDRAW_CAP) {
    return NextResponse.json({ error: "redraw_cap" }, { status: 429 });
  }

  const rate = await checkRateLimit(`coloring:draw:${userId}`, { limit: LIMIT, windowMs: WINDOW_MS });
  if (!rate.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  /* Only one drawing of a page at a time, whatever the client does. */
  const claimed = await claimPage(page.id, ["pending", "failed", "ready"]);
  if (!claimed) return NextResponse.json({ error: "already_drawing" }, { status: 409 });
  if (book.status === "draft") await updateBook(book.id, { status: "writing" });

  try {
    const drawn = await drawColoringPage({ scene: page.scene, detail: page.detail, settings });
    const path = await uploadPageArt(userId, book.id, drawn.png);
    await updatePage(page.id, {
      status: "ready",
      image_path: path,
      redraws: redraw || page.image_path ? page.redraws + 1 : page.redraws,
      stale: false,
    });
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[coloring] page ${position + 1} drawn in ${drawn.seconds.toFixed(1)}s, ${drawn.outputTokens ?? "?"} output tokens, ${Math.round(drawn.png.length / 1024)} KB`,
      );
    }
    if (await allPagesReady(book.id)) await updateBook(book.id, { status: "ready" });
    const fresh = await getPage(book.id, position);
    return NextResponse.json({
      page: { ...(fresh ?? page), url: await signCoverArt(path) },
      tokens: drawn.outputTokens,
      seconds: Math.round(drawn.seconds),
    });
  } catch (error) {
    console.error("coloring page failed", error);
    await updatePage(page.id, { status: page.image_path ? "ready" : "failed" });
    return NextResponse.json({ error: "page_failed" }, { status: 502 });
  }
}
