/**
 * Coloring books: the choices an author makes before a page is drawn, and
 * the bounds every route checks them against. Pure: no React, no server.
 */

export const AGE_BANDS = [
  { id: "3-5", label: "3 to 5", hint: "Very simple shapes, thick lines, one big subject" },
  { id: "6-9", label: "6 to 9", hint: "Clear scenes with a few elements" },
  { id: "10-12", label: "10 to 12", hint: "Richer scenes, finer details" },
  { id: "adults", label: "Adults", hint: "Intricate patterns and detailed scenes" },
] as const;

export const LINE_STYLES = [
  { id: "simple", label: "Simple and bold", hint: "Thick outlines, big areas to fill" },
  { id: "detailed", label: "Detailed", hint: "Finer lines, more to colour" },
] as const;

/** 8.5 × 11 in is the coloring-book standard on Amazon KDP. */
export const PAGE_SIZES = [{ id: "letter", label: "8.5 × 11 in (US Letter)", width: 8.5, height: 11 }] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["id"];
export type LineStyle = (typeof LINE_STYLES)[number]["id"];
export type PageSize = (typeof PAGE_SIZES)[number]["id"];

export const MIN_COLORING_PAGES = 8;
export const MAX_COLORING_PAGES = 40;
export const DEFAULT_COLORING_PAGES = 24;
export const THEME_MAX = 300;

export type ColoringSettings = {
  kind: "coloring";
  theme: string;
  ageBand: AgeBand;
  lineStyle: LineStyle;
  pageSize: PageSize;
  pageCount: number;
  /** Print a blank page behind every picture, so markers never bleed through. */
  blankVersos?: boolean;
};

function isOneOf<T extends readonly { id: string }[]>(list: T, value: unknown): value is T[number]["id"] {
  return typeof value === "string" && list.some((item) => item.id === value);
}

/** The settings a client sent, or null when absent, or "invalid". */
export function parseColoringSettings(value: unknown): ColoringSettings | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";
  const raw = value as Record<string, unknown>;
  if (raw.kind !== "coloring") return "invalid";
  const theme = typeof raw.theme === "string" ? raw.theme.trim() : "";
  if (!theme || theme.length > THEME_MAX) return "invalid";
  if (!isOneOf(AGE_BANDS, raw.ageBand)) return "invalid";
  if (!isOneOf(LINE_STYLES, raw.lineStyle)) return "invalid";
  if (!isOneOf(PAGE_SIZES, raw.pageSize)) return "invalid";
  const pageCount = Number(raw.pageCount);
  if (!Number.isInteger(pageCount) || pageCount < MIN_COLORING_PAGES || pageCount > MAX_COLORING_PAGES) return "invalid";
  return {
    kind: "coloring",
    theme,
    ageBand: raw.ageBand,
    lineStyle: raw.lineStyle,
    pageSize: raw.pageSize,
    pageCount,
    ...(raw.blankVersos === true ? { blankVersos: true } : {}),
  };
}

export function ageBandLabel(id: AgeBand): string {
  return AGE_BANDS.find((band) => band.id === id)?.label ?? id;
}

export function lineStyleLabel(id: LineStyle): string {
  return LINE_STYLES.find((style) => style.id === id)?.label ?? id;
}
