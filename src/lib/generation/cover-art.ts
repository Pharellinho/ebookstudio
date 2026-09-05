import "server-only";
import type { EbookFormat } from "@/lib/content";
import { getOpenAI } from "@/lib/generation/openai";
import { COVER_DIRECTION_MAX } from "@/lib/cover-layouts";

/* The one line every prompt ends with. Image models draw letters badly, and a
   warped title makes a cover unusable on KDP: our code sets the type instead. */
const NO_TEXT = "No text, no lettering, no words, no numbers, no logos, no watermark.";

const IMAGE_MODEL = "gpt-image-1";

const STYLE_BY_FORMAT: Record<string, string> = {
  "lead-magnet": "clean, modern editorial illustration, flat shapes, two or three colours, generous negative space",
  "research-report": "restrained abstract composition, geometric forms, muted palette, institutional and calm",
  "how-to-guide": "warm, tactile illustration of the subject's tools or setting, soft light, inviting",
  "interactive-workbook": "playful flat illustration, bold simple shapes, bright but harmonious colours",
  "course-companion": "structured, bright illustration with a sense of progression, clean shapes",
  "fiction-novel": "painterly, atmospheric scene with depth and mood, cinematic light, literary",
  "coloring-book": "bold black outline drawing style, white background, no shading",
};

/** Strips anything that could steer the prompt away from what we composed. */
function cleanDirection(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, "")
    .trim()
    .slice(0, COVER_DIRECTION_MAX);
}

/**
 * The prompt is ours; the author only adds a short art direction. The upper
 * part of the picture is asked to stay quiet so the title can sit there.
 */
export function coverArtPrompt(input: {
  title: string;
  idea: string;
  format: EbookFormat;
  direction?: string;
}): string {
  const style = STYLE_BY_FORMAT[input.format.slug] ?? STYLE_BY_FORMAT["lead-magnet"];
  const direction = cleanDirection(input.direction);
  return [
    `Book cover illustration for a ${input.format.name.toLowerCase()} titled "${input.title}", about: ${input.idea}.`,
    `Style: ${style}.`,
    "Composition: vertical portrait. The main subject sits in the lower two thirds of the frame. The upper third is calm, uncluttered negative space — plain sky, wall or soft gradient — left empty on purpose so a title can be placed there later.",
    "Single focal subject, no border, no frame, no mock-up of a book.",
    direction ? `Art direction from the author: ${direction}.` : "",
    NO_TEXT,
  ]
    .filter(Boolean)
    .join(" ");
}

/** One portrait illustration as PNG bytes. */
export async function generateCoverArt(prompt: string): Promise<Buffer> {
  const openai = getOpenAI();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1536",
    quality: "medium",
    output_format: "png",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned no picture");
  return Buffer.from(b64, "base64");
}
