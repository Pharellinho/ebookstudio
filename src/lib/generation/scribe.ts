import "server-only";
import { formats } from "@/lib/content";
import { getFormat, type BookOutline } from "@/lib/generation/prompts";
import { GENERATION_MODEL, getOpenAI, sampling, logUsage } from "@/lib/generation/openai";

const EBOOK_FORMATS = formats.filter((f) => f.slug !== "coloring-book");

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

export async function suggestFormat(idea: string): Promise<{
  formatSlug: string;
  formatName: string;
  reason: string;
  credits: number;
  chapters: string;
}> {
  const openai = getOpenAI();
  const catalog = EBOOK_FORMATS.map(
    (f) =>
      `${f.slug}: ${f.name} (${f.chapters} chapters, ${f.credits} credits) — ${f.summary}`,
  ).join("\n");

  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.3),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You pick the best ebook format for a user's idea.
Return ONLY JSON: {"formatSlug":"...","reason":"one short sentence"}
Allowed formatSlug values:
${catalog}`,
      },
      { role: "user", content: idea },
    ],
  });

  logUsage("format-pick", GENERATION_MODEL, completion.usage);
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty format suggestion");
  const parsed = extractJsonObject(raw) as {
    formatSlug?: string;
    reason?: string;
  };
  const format =
    getFormat(String(parsed.formatSlug ?? "")) ??
    getFormat("lead-magnet") ??
    EBOOK_FORMATS[0];

  return {
    formatSlug: format.slug,
    formatName: format.name,
    reason: String(parsed.reason ?? `This looks like a ${format.name}.`).trim(),
    credits: format.credits,
    chapters: format.chapters,
  };
}

export async function suggestTitles(input: {
  idea: string;
  formatSlug: string;
}): Promise<{ titles: { title: string; blurb: string }[] }> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.9),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You invent publishable ebook titles for a "${format.name}".
Return ONLY JSON:
{"titles":[{"title":"...","blurb":"one short line"}]}
Exactly 3 options. Titles punchy, benefit-led, under 70 characters.`,
      },
      {
        role: "user",
        content: `Idea: ${input.idea}\nFormat: ${format.name}`,
      },
    ],
  });

  logUsage("titles", GENERATION_MODEL, completion.usage);
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty titles");
  const parsed = extractJsonObject(raw) as {
    titles?: { title?: string; blurb?: string }[];
  };
  const titles = (parsed.titles ?? [])
    .slice(0, 3)
    .map((item) => ({
      title: String(item.title ?? "").trim(),
      blurb: String(item.blurb ?? "").trim(),
    }))
    .filter((item) => item.title);

  if (titles.length < 3) throw new Error("Need 3 titles");
  return { titles };
}

export async function planOutline(input: {
  idea: string;
  formatSlug: string;
  title: string;
}): Promise<BookOutline> {
  const format = getFormat(input.formatSlug);
  if (!format) throw new Error("Unknown format");

  const { generateOutline } = await import("@/lib/generation/run");
  const outline = await generateOutline({
    idea: `${input.idea}\nChosen title: ${input.title}`,
    formatSlug: input.formatSlug,
  });

  return {
    ...outline,
    title: input.title,
  };
}

export { EBOOK_FORMATS };
