import "server-only";
import { getFormat } from "@/lib/generation/prompts";
import {
  chapterSystemPrompt,
  chapterUserPrompt,
  outlineSystemPrompt,
  outlineUserPrompt,
  MAX_OUTLINE_CHAPTERS,
  type BookOutline,
} from "@/lib/generation/prompts";
import { GENERATION_MODEL, getOpenAI } from "@/lib/generation/openai";

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

export async function generateOutline(input: {
  idea: string;
  formatSlug: string;
}): Promise<BookOutline> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: outlineSystemPrompt(format) },
      { role: "user", content: outlineUserPrompt(input.idea, format) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty outline response");

  const parsed = extractJsonObject(raw) as BookOutline;
  if (
    !parsed?.title ||
    !Array.isArray(parsed.chapters) ||
    parsed.chapters.length === 0
  ) {
    throw new Error("Invalid outline shape");
  }

  return {
    title: String(parsed.title).trim(),
    subtitle: String(parsed.subtitle ?? "").trim(),
    // A model that ignores the requested count must not turn into a bill.
    chapters: parsed.chapters
      .slice(0, MAX_OUTLINE_CHAPTERS)
      .map((chapter) => ({
        title: String(chapter.title).trim(),
        summary: String(chapter.summary).trim(),
      })),
  };
}

export async function* streamChapter(input: {
  idea: string;
  formatSlug: string;
  bookTitle: string;
  chapterTitle: string;
  chapterSummary: string;
  chapterIndex: number;
  chapterTotal: number;
  previousTitles: string[];
}): AsyncGenerator<string> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const openai = getOpenAI();
  const stream = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    temperature: 0.75,
    stream: true,
    messages: [
      { role: "system", content: chapterSystemPrompt(format) },
      {
        role: "user",
        content: chapterUserPrompt({
          idea: input.idea,
          bookTitle: input.bookTitle,
          formatName: format.name,
          chapterTitle: input.chapterTitle,
          chapterSummary: input.chapterSummary,
          chapterIndex: input.chapterIndex,
          chapterTotal: input.chapterTotal,
          previousTitles: input.previousTitles,
        }),
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
