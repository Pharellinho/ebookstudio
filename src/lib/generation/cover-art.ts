import "server-only";
import type { EbookFormat } from "@/lib/content";
import { getOpenAI } from "@/lib/generation/openai";

const IMAGE_MODEL = "gpt-image-1";

/* Three directions per run, so the author gets a real choice. Each one is
   written the way an art director briefs a cover designer: a printed object
   from a real publisher, with the restraint that implies. */
export const COVER_VARIANTS = [
  {
    id: "illustrated",
    brief:
      "Direction A — illustrated trade cover: one hand-drawn or painted illustration of the subject, flat colour areas with visible texture (ink, gouache, risograph grain), a restrained palette of three or four colours, generous negative space where the title sits.",
  },
  {
    id: "photographic",
    brief:
      "Direction B — photographic cover: a single real-world still-life or scene, shot on film with soft natural light and shallow depth of field, muted true-to-life colours, a quiet area of the frame reserved for the title.",
  },
  {
    id: "typographic",
    brief:
      "Direction C — typographic cover: a solid matte background in one deep colour, a single small graphic mark or motif, and the title carrying the whole design in large, confident lettering with careful spacing.",
  },
] as const;

const GENRE_BY_FORMAT: Record<string, string> = {
  "lead-magnet": "a short business guide from a modern non-fiction imprint",
  "research-report": "an institutional report from a research house",
  "how-to-guide": "a practical non-fiction paperback from a lifestyle imprint",
  "interactive-workbook": "a workbook from an educational publisher",
  "course-companion": "a course companion from an educational publisher",
  "fiction-novel": "a literary novel from a major publishing house",
  "coloring-book": "a children's coloring book from a family publisher",
};

/* What makes a picture read as machine-made, spelled out so the model
   avoids it: over-saturation, glossy renders, symmetry, clutter. */
const NOT_AI_LOOK =
  "It must look like a real printed book designed by a professional cover designer and photographed flat: matte paper finish, subtle print grain, controlled colour, asymmetric composition, plenty of breathing room. Avoid: glossy 3D renders, neon or over-saturated colours, lens flares, hyper-detailed clutter, perfectly symmetrical layouts, glowing edges, fantasy-art gloss, stock-photo smiles.";

/** Quotes are what the model must copy letter for letter. */
function exact(text: string) {
  return `"${text.replace(/"/g, "'")}"`;
}

/**
 * The whole cover comes out of the model — title, subtitle and author name
 * drawn into the picture. Nothing is asked of the reader but the author's
 * name; the direction comes from the format and the three briefs above.
 */
export function coverPrompt(input: {
  title: string;
  subtitle: string | null;
  author: string;
  idea: string;
  format: EbookFormat;
  variant: (typeof COVER_VARIANTS)[number];
}): string {
  const genre = GENRE_BY_FORMAT[input.format.slug] ?? GENRE_BY_FORMAT["lead-magnet"];
  const textBlock = [
    `The title, large and dominant in the upper part, spelled exactly: ${exact(input.title)}.`,
    input.subtitle
      ? `The subtitle, smaller, directly under the title, spelled exactly: ${exact(input.subtitle)}.`
      : "",
    `The author's name, small and discreet near the bottom, spelled exactly: ${exact(input.author)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `Front cover of ${genre}. The book is about: ${input.idea}.`,
    input.variant.brief,
    NOT_AI_LOOK,
    "Vertical portrait, the cover fills the entire frame edge to edge: no border, no mock-up, no hands, no table, no shelf, no spine, no shadow.",
    textBlock,
    "Typography: a clean professional typeface, straight baselines, correct spelling with every letter legible, strong hierarchy between title, subtitle and author. No other words, numbers, logos, badges, stickers, blurbs or watermarks anywhere.",
  ].join(" ");
}

/** One complete cover as PNG bytes. */
export async function generateCover(prompt: string): Promise<Buffer> {
  const openai = getOpenAI();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned no picture");
  return Buffer.from(b64, "base64");
}
