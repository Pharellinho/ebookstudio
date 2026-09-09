import { MAX_OUTLINE_CHAPTERS, type BookOutline } from "@/lib/generation/prompts";

const MAX_TITLE_LENGTH = 300;
const MAX_SUMMARY_LENGTH = 2000;

/**
 * The outline a client sends decides how many OpenAI calls the generate route
 * will later make, so it is a bill, not just display data. Anything that is not
 * a well-formed outline within bounds is refused rather than trimmed, so a
 * caller never quietly gets a different book than the one it asked for.
 */
export function parseOutline(value: unknown): BookOutline | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";

  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const subtitle = typeof raw.subtitle === "string" ? raw.subtitle.trim() : "";

  if (!title || title.length > MAX_TITLE_LENGTH) return "invalid";
  if (subtitle.length > MAX_TITLE_LENGTH) return "invalid";
  if (!Array.isArray(raw.chapters)) return "invalid";
  if (raw.chapters.length < 1 || raw.chapters.length > MAX_OUTLINE_CHAPTERS) {
    return "invalid";
  }

  const chapters: BookOutline["chapters"] = [];
  for (const entry of raw.chapters) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return "invalid";
    }
    const chapter = entry as Record<string, unknown>;
    const chapterTitle =
      typeof chapter.title === "string" ? chapter.title.trim() : "";
    const summary =
      typeof chapter.summary === "string" ? chapter.summary.trim() : "";

    if (!chapterTitle || chapterTitle.length > MAX_TITLE_LENGTH) {
      return "invalid";
    }
    if (summary.length > MAX_SUMMARY_LENGTH) return "invalid";

    chapters.push({ title: chapterTitle, summary });
  }

  return { title, subtitle, chapters };
}

