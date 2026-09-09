import "server-only";
import { PNG } from "pngjs";
import { getOpenAI, logUsage } from "@/lib/generation/openai";
import { ageBandLabel, type ColoringSettings } from "@/lib/coloring";

/**
 * One coloring page: the image model draws it as black lines on white from
 * the plan's line, then the picture is cleaned to pure black and pure
 * white so nothing grey survives into print.
 */

const IMAGE_MODEL = "gpt-image-2";

/* 8.5 × 11 in as the model likes its sizes: edges multiples of 16, under
   its pixel budget. 2432 × 3152 keeps the ratio within a tenth of a percent
   and prints at about 286 dpi. */
export const PAGE_IMAGE_SIZE = "2432x3152";

const DEV = process.env.NODE_ENV !== "production";

/* Line art does not need the model's highest quality; "medium" keeps the
   cost of a book sane. COLORING_DEV_QUALITY=low for cheap prompt tuning. */
function quality(): "low" | "medium" | "high" {
  const wanted = DEV ? process.env.COLORING_DEV_QUALITY : undefined;
  return wanted === "low" || wanted === "high" ? wanted : "medium";
}

const AGE_RULES: Record<ColoringSettings["ageBand"], string> = {
  "3-5":
    "For children of three to five: ONE big friendly subject filling most of the page, very few extra elements, large simple shapes, no small parts, nothing frightening, big round eyes and gentle expressions.",
  "6-9":
    "For children of six to nine: one clear main subject with two or three supporting elements and a simple setting, shapes large enough to colour with a crayon.",
  "10-12":
    "For children of ten to twelve: a fuller scene with several elements, some patterns and textures drawn as lines, still readable and fun.",
  adults:
    "For adults: an intricate scene with many elements and decorative patterns, fine detail worth an hour of colouring, still one coherent picture.",
};

const STYLE_RULES: Record<ColoringSettings["lineStyle"], string> = {
  simple: "Thick, bold, even outlines; big open areas to fill; very few interior lines.",
  detailed: "Finer, even outlines; more interior lines, patterns and textures drawn as lines; still no shading.",
};

export function coloringPagePrompt(input: { scene: string; detail: string; settings: ColoringSettings }): string {
  const { settings } = input;
  return [
    "A coloring book page. BLACK LINE ART ONLY on a PURE WHITE background: clean, confident outlines, every shape closed so it can be coloured in.",
    "No shading, no hatching, no cross-hatching, no grey, no gradients, no solid black areas, no colour of any kind, no background texture, no paper texture. White stays white.",
    `${AGE_RULES[settings.ageBand]} ${STYLE_RULES[settings.lineStyle]}`,
    `The picture: ${input.scene}. ${input.detail}`,
    "The scene fills the page with a clear white margin of at least 6% on every side; nothing touches the edges; no frame or border around the picture.",
    "Absolutely no text, letters, numbers, captions, titles, signatures, logos, watermarks or speech bubbles anywhere.",
    `Portrait page, 8.5 by 11 inches, drawn for a ${ageBandLabel(settings.ageBand)} audience, wholesome and friendly.`,
  ].join(" ");
}

/**
 * Pure black and pure white. The model leaves soft grey along the lines
 * and sometimes a faint tint on the page; a threshold turns every pixel
 * into ink or paper, which is what a printed coloring page must be.
 */
export function cleanLineArt(png: Buffer, threshold = 150): Buffer {
  const image = PNG.sync.read(png);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Transparent counts as paper.
    const luminance = alpha === 0 ? 255 : (r * 299 + g * 587 + b * 114) / 1000;
    const ink = luminance < threshold ? 0 : 255;
    data[i] = ink;
    data[i + 1] = ink;
    data[i + 2] = ink;
    data[i + 3] = 255;
  }
  image.colorType = 0;
  return PNG.sync.write(image, { colorType: 0 });
}

export type DrawnPage = { png: Buffer; outputTokens: number | null; seconds: number };

/** Draws one page and cleans it. Throws when the model returns nothing. */
export async function drawColoringPage(input: {
  scene: string;
  detail: string;
  settings: ColoringSettings;
}): Promise<DrawnPage> {
  const started = Date.now();
  const openai = getOpenAI();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: coloringPagePrompt(input),
    n: 1,
    size: PAGE_IMAGE_SIZE,
    quality: quality(),
    output_format: "png",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned no picture");
  const raw = Buffer.from(b64, "base64");
  const png = cleanLineArt(raw);
  const usage = (result as { usage?: { output_tokens?: number } }).usage;
  logUsage(`coloring-page(${PAGE_IMAGE_SIZE},${quality()})`, IMAGE_MODEL, usage as Parameters<typeof logUsage>[2]);
  return { png, outputTokens: usage?.output_tokens ?? null, seconds: (Date.now() - started) / 1000 };
}
