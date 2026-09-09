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
import { GENERATION_MODEL, getOpenAI, sampling, logUsage } from "@/lib/generation/openai";

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

export async function generateOutline(input: {
  idea: string;
  formatSlug: string;
  /** Elements a previous attempt got wrong; the model must not use them. */
  avoid?: { item: string; why: string }[];
  /** Dev comparisons only; production always uses GENERATION_MODEL. */
  model?: string;
}): Promise<BookOutline> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const avoidBlock =
    input.avoid && input.avoid.length > 0
      ? `\n\nA previous outline for this idea contained elements that do NOT belong to the subject. Do not use them or anything from the same wrong scope:\n${input.avoid
          .map((problem) => `- ${problem.item}: ${problem.why}`)
          .join("\n")}`
      : "";

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: input.model ?? GENERATION_MODEL,
    ...sampling(input.model ?? GENERATION_MODEL, 0.7),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: outlineSystemPrompt(format) },
      { role: "user", content: outlineUserPrompt(input.idea, format) + avoidBlock },
    ],
  });

  logUsage("outline", input.model ?? GENERATION_MODEL, completion.usage);
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

export type OutlineProblem = { item: string; why: string };

/**
 * Asks the text model to audit an outline against the subject it was asked
 * for: every title or element that belongs to the wrong country, region,
 * field or era. One call, JSON out. A technical failure is not a verdict:
 * the caller treats it as "nothing found" and carries on.
 */
export async function verifyOutline(input: {
  idea: string;
  outline: BookOutline;
  model?: string;
}): Promise<OutlineProblem[]> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: input.model ?? GENERATION_MODEL,
    ...sampling(input.model ?? GENERATION_MODEL, 0),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a fact-checker for book outlines. You are given the subject a reader asked for and the outline a writer produced. List every title, dish, place, name, practice or example in the outline that does NOT genuinely belong to the subject's exact scope: wrong country, wrong region, wrong culture, wrong field, wrong era, or a better-known neighbour substituted for the real thing. Be strict about scope but do not invent problems: something that truly belongs to the subject is not a problem.
Return ONLY JSON: {"problems":[{"item":"the offending title or element, quoted from the outline","why":"one sentence: where it actually belongs and why it is out of scope"}]}
Return {"problems":[]} when everything belongs.`,
      },
      {
        role: "user",
        content: `Subject asked for: ${input.idea}

Outline:
Title: ${input.outline.title}
Subtitle: ${input.outline.subtitle}
${input.outline.chapters.map((c, i) => `${i + 1}. ${c.title} — ${c.summary}`).join("\n")}`,
      },
    ],
  });
  logUsage("outline-check", input.model ?? GENERATION_MODEL, completion.usage);

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = extractJsonObject(raw) as { problems?: unknown };
  if (!Array.isArray(parsed.problems)) return [];
  return parsed.problems
    .filter(
      (p): p is OutlineProblem =>
        typeof p === "object" && p !== null && typeof (p as OutlineProblem).item === "string",
    )
    .map((p) => ({ item: p.item.trim(), why: String(p.why ?? "").trim() }))
    .filter((p) => p.item.length > 0)
    .slice(0, 20);
}

/**
 * Outline, then audit, then at most ONE regeneration with the audit's
 * findings handed to the writer as things to avoid. No loop: if the second
 * outline still has problems, it is used as is. If the audit itself fails
 * for a technical reason, generation is never blocked.
 */
export async function generateVerifiedOutline(input: {
  idea: string;
  formatSlug: string;
  model?: string;
}): Promise<{ outline: BookOutline; problems: OutlineProblem[]; regenerated: boolean }> {
  const first = await generateOutline(input);

  let problems: OutlineProblem[] = [];
  try {
    problems = await verifyOutline({ idea: input.idea, outline: first, model: input.model });
  } catch (error) {
    console.error("outline verification failed; continuing", error);
    return { outline: first, problems: [], regenerated: false };
  }
  if (problems.length === 0) return { outline: first, problems, regenerated: false };

  const second = await generateOutline({ ...input, avoid: problems });
  return { outline: second, problems, regenerated: true };
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
  /** Aborting it stops the OpenAI stream mid-chapter instead of paying for the rest. */
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const openai = getOpenAI();
  const stream = await openai.chat.completions.create(
    {
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.75),
    stream: true,
    stream_options: { include_usage: true },
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
    },
    { signal: input.signal },
  );

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
    /* The last chunk carries the usage and no text. */
    if (chunk.usage) logUsage("chapter", GENERATION_MODEL, chunk.usage);
  }
}
