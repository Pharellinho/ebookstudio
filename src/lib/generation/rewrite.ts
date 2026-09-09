import "server-only";
import type { EbookFormat } from "@/lib/content";
import { GENERATION_MODEL, getOpenAI, sampling, logUsage } from "@/lib/generation/openai";
import {
  rewriteSystemPrompt,
  rewriteUserPrompt,
  type RewriteAction,
} from "@/lib/generation/prompts";

/* A paragraph twice the size of a long one is still well under this; the cap
   keeps a runaway "expand" from turning into a chapter. */
const MAX_OUTPUT_TOKENS = 1200;

/** Strips the wrappers a model adds despite being told not to. */
function cleanReplacement(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```[a-z]*\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/^(?:revised|replacement|paragraph)\s*:\s*/i, "").trim();
}

export async function rewriteParagraph(input: {
  format: EbookFormat;
  bookTitle: string;
  bookSubtitle: string | null;
  chapterTitle: string;
  chapterSummary: string;
  previous: string | null;
  next: string | null;
  paragraph: string;
  action: RewriteAction;
  instruction?: string;
}): Promise<string> {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.5),
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: rewriteSystemPrompt(input.format) },
      {
        role: "user",
        content: rewriteUserPrompt({
          bookTitle: input.bookTitle,
          bookSubtitle: input.bookSubtitle,
          formatName: input.format.name,
          chapterTitle: input.chapterTitle,
          chapterSummary: input.chapterSummary,
          previous: input.previous,
          next: input.next,
          paragraph: input.paragraph,
          action: input.action,
          instruction: input.instruction,
        }),
      },
    ],
  });
  logUsage("rewrite", GENERATION_MODEL, completion.usage);

  const text = cleanReplacement(completion.choices[0]?.message?.content ?? "");
  if (!text) throw new Error("Empty rewrite");
  return text;
}
