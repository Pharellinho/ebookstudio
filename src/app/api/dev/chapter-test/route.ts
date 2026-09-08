// TEMPORARY dev-only check: writes one chapter with the real prompts and
// reports the dashes and banned patterns before and after cleaning.
// Answers 404 in production. Delete after tuning.
import { NextResponse } from "next/server";
import { cleanModelText, countProseDashes } from "@/lib/generation/clean";
import { streamChapter } from "@/lib/generation/run";

export const maxDuration = 300;

const BANNED = [
  /\bnot (?:just|merely|only) .{1,80}?\b(?:it'?s|but|it is)\b/i,
  /\bisn'?t just\b/i,
  /\bmore than just\b/i,
  /(?:^|\. )(?:Moreover|Furthermore|Additionally|In conclusion)\b/m,
];

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  let raw = "";
  for await (const chunk of streamChapter({
    idea: "How a foreign student finds a job in Germany: paperwork, where to look, how to apply, what employers expect",
    formatSlug: "how-to-guide",
    bookTitle: "The German Job Hunt",
    chapterTitle: "A German CV, line by line",
    chapterSummary: "What a German CV must contain, in what order, and the three mistakes that get foreign applicants rejected before the interview.",
    chapterIndex: 2,
    chapterTotal: 8,
    previousTitles: ["Which permits you need before you apply", "Where the student jobs actually are"],
  })) {
    raw += chunk;
  }
  const cleaned = cleanModelText(raw);
  const report = (text: string) => ({
    emDashes: (text.match(/—/g) ?? []).length,
    enDashes: (text.match(/–/g) ?? []).length,
    proseDashes: countProseDashes(text),
    semicolons: (text.match(/;/g) ?? []).length,
    banned: BANNED.map((re) => text.match(re)?.[0] ?? null).filter(Boolean),
    words: text.split(/\s+/).length,
  });
  return NextResponse.json({ raw: report(raw), cleaned: report(cleaned), text: cleaned });
}
