import "server-only";
import { GENERATION_MODEL, getOpenAI, sampling, logUsage } from "@/lib/generation/openai";
import { cleanModelText } from "@/lib/generation/clean";
import { ageBandLabel, type ColoringSettings } from "@/lib/coloring";

/**
 * The plan of a coloring book: one scene per page, worked out by the text
 * model before any page is drawn. This is the only text call of a coloring
 * book besides the cover brief; everything after it is the image model.
 */

export type ColoringScene = {
  /** The page's label, a few words: "A cow in the meadow". */
  scene: string;
  /** One line for the illustrator: subject, what it does, where, two or three props, framing. */
  detail: string;
};

export type ColoringPlan = {
  title: string;
  subtitle: string;
  scenes: ColoringScene[];
};

const COMPLEXITY: Record<ColoringSettings["ageBand"], string> = {
  "3-5":
    "one big friendly subject per page, very few elements, no tiny parts, nothing scary, everything recognisable at a glance",
  "6-9": "a clear scene with one main subject and two or three supporting elements, some background, still easy to colour",
  "10-12": "a fuller scene with several elements, some pattern or texture, a little challenge",
  adults:
    "intricate scenes and patterns, many elements, fine detail worth an hour of colouring, still coherent as one picture",
};

const SYSTEM = `You plan coloring books for a small publisher. You will receive a theme, an age band, a page count and a line style. Return the plan as JSON only.

Rules for the pages:
- One scene per page, and every scene DIFFERENT: a different subject, or the same subject in a clearly different situation. No two pages a reader would confuse.
- Order the pages with a gentle progression: the simplest scenes first, the richest last.
- Each scene is something a line artist can draw in black outlines on white: a concrete subject doing a concrete thing in a concrete place. No abstract ideas, no captions, no words or letters anywhere in the picture, no logos, no trademarked characters.
- Keep the theme's world: a farm book stays on the farm; every page should feel like it belongs to the same book.
- "scene" is the page label, at most eight words. "detail" is the brief for the illustrator, one sentence of at most thirty words: the subject, what it is doing, where, two or three props, and how the picture is framed (close, full scene, from above).
- Never use dashes in the text. Plain, warm, specific English.

Also give a title (two to five words, no colon) and a subtitle (at most ten words) if none is imposed.`;

function planPrompt(settings: ColoringSettings, title: string | null, count: number, avoid: string[]): string {
  return [
    `Theme: ${settings.theme}`,
    `Age band: ${ageBandLabel(settings.ageBand)} — ${COMPLEXITY[settings.ageBand]}.`,
    `Line style: ${settings.lineStyle === "simple" ? "simple and bold, thick outlines, large areas" : "detailed, finer lines, more elements"}.`,
    `Number of pages: ${count}.`,
    title ? `Title (imposed, keep it): ${title}` : "Title: suggest one.",
    avoid.length > 0
      ? `Pages that already exist, do NOT repeat or resemble them:\n${avoid.map((scene) => `- ${scene}`).join("\n")}`
      : "",
    `Return: {"title":"...","subtitle":"...","scenes":[{"scene":"...","detail":"..."}]} with exactly ${count} scenes.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseScenes(raw: unknown, count: number): ColoringScene[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      scene: cleanModelText(typeof item.scene === "string" ? item.scene.trim() : "").slice(0, 120),
      detail: cleanModelText(typeof item.detail === "string" ? item.detail.trim() : "").slice(0, 400),
    }))
    .filter((item) => item.scene && item.detail)
    .slice(0, count);
}

async function ask(prompt: string): Promise<Record<string, unknown>> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.6),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
  });
  logUsage("coloring-plan", GENERATION_MODEL, completion.usage);
  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** The whole plan, with a title when the author gave none. */
export async function planColoringPages(settings: ColoringSettings, title: string | null): Promise<ColoringPlan> {
  const parsed = await ask(planPrompt(settings, title, settings.pageCount, []));
  const scenes = parseScenes(parsed.scenes, settings.pageCount);
  if (scenes.length === 0) throw new Error("The plan came back empty");
  return {
    title: title ?? cleanModelText(typeof parsed.title === "string" ? parsed.title.trim() : "").slice(0, 120) ?? "",
    subtitle: cleanModelText(typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "").slice(0, 160),
    scenes,
  };
}

/** A few fresh scenes that fit the book and repeat none of the existing ones. */
export async function moreColoringScenes(
  settings: ColoringSettings,
  title: string | null,
  existing: string[],
  count: number,
): Promise<ColoringScene[]> {
  const parsed = await ask(planPrompt(settings, title, count, existing));
  const scenes = parseScenes(parsed.scenes, count);
  if (scenes.length === 0) throw new Error("No new scene came back");
  return scenes;
}
