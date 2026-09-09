import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseColoringSettings } from "@/lib/coloring";
import { moreColoringScenes, planColoringPages } from "@/lib/generation/coloring";
import { openaiConfigured } from "@/lib/generation/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/request-origin";
import { planAllowsColoring } from "@/lib/billing/plans";
import { loadBilling } from "@/lib/billing/subscription";

const LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_MORE = 6;

/**
 * POST { settings, title? }                 → { plan }   the whole page plan
 * POST { settings, title?, existing, count } → { scenes } a few fresh pages
 *
 * One text call either way. The pages themselves are drawn later, from the
 * saved plan, by the image model.
 */
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
  if (!planAllowsColoring((await loadBilling(userId)).plan)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const input = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};

  const settings = parseColoringSettings(input.settings);
  if (!settings || settings === "invalid") {
    return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  }
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim().slice(0, 200) : null;

  const rate = await checkRateLimit(`coloring:plan:${userId}`, { limit: LIMIT, windowMs: WINDOW_MS });
  if (!rate.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    if (Array.isArray(input.existing)) {
      const existing = input.existing.filter((item): item is string => typeof item === "string").slice(0, 60);
      const count = Math.min(MAX_MORE, Math.max(1, Number(input.count) || 1));
      const scenes = await moreColoringScenes(settings, title, existing, count);
      return NextResponse.json({ scenes });
    }
    const plan = await planColoringPages(settings, title);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("coloring plan failed", error);
    return NextResponse.json({ error: "plan_failed" }, { status: 502 });
  }
}
