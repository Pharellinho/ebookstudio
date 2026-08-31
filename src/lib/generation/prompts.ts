import type { EbookFormat } from "@/lib/content";
import { formats } from "@/lib/content";

export type OutlineChapter = {
  title: string;
  summary: string;
};

export type BookOutline = {
  title: string;
  subtitle: string;
  chapters: OutlineChapter[];
};

export function getFormat(slug: string): EbookFormat | undefined {
  return formats.find((format) => format.slug === slug);
}

export function targetChapterCount(format: EbookFormat): number {
  const match = format.chapters.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!match) return 6;
  return Math.round((Number(match[1]) + Number(match[2])) / 2);
}

export function outlineSystemPrompt(format: EbookFormat): string {
  const count = targetChapterCount(format);
  if (format.slug === "coloring-book") {
    return `You are EbookStudio's coloring-book art director. Build a page plan for a printable coloring book.

Audience: ${format.audience}

Rules:
- Return ONLY valid JSON:
  {"title":"...","subtitle":"...","chapters":[{"title":"...","summary":"..."}]}
- Exactly ${count} chapters — each chapter is ONE coloring page
- title = short scene name for the page
- summary = what to draw in black-and-white line art (subjects, composition, complexity)
- Scenes should vary across the book
- No markdown fences, no commentary`;
  }

  return `You are EbookStudio's book architect. Build a tight outline for a "${format.name}" ebook.

Audience: ${format.audience}
Style notes: ${format.highlights.join("; ")}

Rules:
- Return ONLY valid JSON matching this shape:
  {"title":"...","subtitle":"...","chapters":[{"title":"...","summary":"..."}]}
- Exactly ${count} chapters
- Titles are concrete and benefit-led, not vague
- Each chapter summary is 1–2 sentences
- No markdown fences, no commentary`;
}

export function outlineUserPrompt(idea: string, format: EbookFormat): string {
  return `Idea: ${idea}

Format: ${format.name} (${format.pages} pages, ${format.chapters} chapters)
Summary of this format: ${format.summary}`;
}

export function chapterSystemPrompt(format: EbookFormat): string {
  if (format.slug === "coloring-book") {
    return `You are EbookStudio's coloring-page writer. Describe ONE printable black-and-white coloring page in clear Markdown.

Rules:
- Start with a short "Scene" paragraph (what the page shows)
- Then a bullet list of "Line art notes" (subjects, foreground/background, complexity)
- Then "Print tip" with one sentence for KDP / home printing
- Do NOT invent color fills — outlines only
- Do NOT repeat the page title as an H1
- Keep it practical for an illustrator or image model later`;
  }

  return `You are EbookStudio's ghostwriter. Write one chapter of a "${format.name}" ebook.

Audience: ${format.audience}
Voice: clear, practical, confident. Short paragraphs. Skimmable headings inside the chapter when useful.

Rules:
- Write the full chapter body in Markdown
- Do NOT repeat the chapter title as an H1
- Do NOT invent a different title
- End with a short takeaway or action the reader can do next
- Stay on the outline summary — no filler`;
}

export function chapterUserPrompt(input: {
  idea: string;
  bookTitle: string;
  formatName: string;
  chapterTitle: string;
  chapterSummary: string;
  chapterIndex: number;
  chapterTotal: number;
  previousTitles: string[];
}): string {
  const previous =
    input.previousTitles.length > 0
      ? `Previous chapters: ${input.previousTitles.join(" → ")}`
      : "This is the opening chapter.";

  return `Book title: ${input.bookTitle}
Format: ${input.formatName}
Idea: ${input.idea}

Chapter ${input.chapterIndex + 1} of ${input.chapterTotal}
Title: ${input.chapterTitle}
Outline: ${input.chapterSummary}
${previous}

Write the chapter now.`;
}
