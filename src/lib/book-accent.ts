import { themesForFormat } from "@/lib/book-design";

/** The honey accent of the design system: what an old row falls back to. */
export const DEFAULT_ACCENT = "#b8860b";

/** The accent of a format's first theme — a safe default when no theme is stored. */
export function accentForFormat(formatSlug: string): string {
  return themesForFormat(formatSlug)[0]?.accent ?? DEFAULT_ACCENT;
}

/** Guards against a bad value from the database ever reaching an inline style. */
export function safeAccent(value: string | null | undefined, fallback = DEFAULT_ACCENT): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
