// TEMPORARY dev bench for coloring pages: draws one page from a scene line
// and writes the raw and the cleaned picture to disk, with timing and token
// usage. Dev only: answers 404 in production. Delete after tuning.
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/generation/openai";
import { PAGE_IMAGE_SIZE, cleanLineArt, coloringPagePrompt } from "@/lib/generation/coloring-art";
import { parseColoringSettings } from "@/lib/coloring";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const out = url.searchParams.get("out") ?? "/tmp/coloring-test";
  const name = url.searchParams.get("name") ?? "page";
  const settings = parseColoringSettings({
    kind: "coloring",
    theme: url.searchParams.get("theme") ?? "farm animals",
    ageBand: url.searchParams.get("age") ?? "6-9",
    lineStyle: url.searchParams.get("style") ?? "simple",
    pageSize: "letter",
    pageCount: 12,
  });
  if (!settings || settings === "invalid") return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  const scene = url.searchParams.get("scene") ?? "Hen Feeding Her Chicks";
  const detail =
    url.searchParams.get("detail") ??
    "A hen watches three chicks peck grain beside the coop, with a feed bowl and short fence, shown in a close view.";
  const quality = (url.searchParams.get("quality") ?? "medium") as "low" | "medium" | "high";

  await mkdir(out, { recursive: true });
  const prompt = coloringPagePrompt({ scene, detail, settings });
  const started = Date.now();
  const result = await getOpenAI().images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: PAGE_IMAGE_SIZE,
    quality,
    output_format: "png",
  });
  const seconds = (Date.now() - started) / 1000;
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) return NextResponse.json({ error: "no_image" }, { status: 502 });
  const raw = Buffer.from(b64, "base64");
  const cleanStarted = Date.now();
  const cleaned = cleanLineArt(raw);
  const cleanMs = Date.now() - cleanStarted;
  await writeFile(`${out}/${name}-raw.png`, raw);
  await writeFile(`${out}/${name}-clean.png`, cleaned);
  const usage = (result as { usage?: { output_tokens?: number; total_tokens?: number } }).usage;
  return NextResponse.json({
    files: [`${out}/${name}-raw.png`, `${out}/${name}-clean.png`],
    seconds: Math.round(seconds),
    cleanMs,
    rawKb: Math.round(raw.length / 1024),
    cleanKb: Math.round(cleaned.length / 1024),
    usage: usage ?? null,
    prompt,
  });
}
