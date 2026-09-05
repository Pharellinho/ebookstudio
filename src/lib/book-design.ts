/**
 * The typographic identity of a generated book.
 *
 * `BookDesign` is fixed per format (a manual should not read like a novel);
 * `BookTheme` is one of three variations inside that identity — accent,
 * heading weight, rule treatment — picked deterministically from the book id
 * at creation and changeable by the author in the studio. Both feed the same
 * `BookPage` renderer that the studio preview uses and the PDF will use.
 *
 * Vocabulary follows the landing's sample books (src/lib/samples.ts), with
 * "rule" added as a sober opener and "left" as the plain name for ragged.
 */
export type BookDesign = {
  typeface: "serif" | "sans";
  align: "justify" | "left";
  dropCap: boolean;
  chapterOpener: "classic" | "banner" | "block" | "numeral" | "rule";
  runningHead: "smallcaps" | "rule" | "none";
};

export type BookTheme = {
  /** Stored on books.theme; stable, human-readable. */
  id: string;
  name: string;
  /** #rrggbb — only tokens the design system already uses. */
  accent: string;
  headingWeight: "semibold" | "bold" | "extrabold";
  rule: "hairline" | "bar" | "dotted";
};

/* The palette: honey tokens plus the accents of the sample books. */
const HONEY = "#d4a017";
const HONEY_STRONG = "#b8860b";
const MOSS = "#2f6b4f";
const FERN = "#3d6b4f";
const TEAL = "#0e7490";
const INK = "#1a1f2e";

const IDENTITIES: Record<string, { design: BookDesign; themes: BookTheme[] }> = {
  "fiction-novel": {
    design: { typeface: "serif", align: "justify", dropCap: true, chapterOpener: "classic", runningHead: "smallcaps" },
    themes: [
      { id: "ink", name: "Ink", accent: INK, headingWeight: "semibold", rule: "hairline" },
      { id: "honey", name: "Honey", accent: HONEY_STRONG, headingWeight: "semibold", rule: "hairline" },
      { id: "moss", name: "Moss", accent: MOSS, headingWeight: "semibold", rule: "dotted" },
    ],
  },
  "how-to-guide": {
    design: { typeface: "sans", align: "left", dropCap: false, chapterOpener: "banner", runningHead: "rule" },
    themes: [
      { id: "moss", name: "Moss", accent: MOSS, headingWeight: "bold", rule: "bar" },
      { id: "honey", name: "Honey", accent: HONEY, headingWeight: "extrabold", rule: "bar" },
      { id: "teal", name: "Teal", accent: TEAL, headingWeight: "bold", rule: "hairline" },
    ],
  },
  "lead-magnet": {
    design: { typeface: "sans", align: "left", dropCap: false, chapterOpener: "block", runningHead: "none" },
    themes: [
      { id: "honey", name: "Honey", accent: HONEY, headingWeight: "extrabold", rule: "bar" },
      { id: "ink", name: "Ink", accent: INK, headingWeight: "extrabold", rule: "bar" },
      { id: "teal", name: "Teal", accent: TEAL, headingWeight: "bold", rule: "hairline" },
    ],
  },
  "interactive-workbook": {
    design: { typeface: "sans", align: "left", dropCap: false, chapterOpener: "numeral", runningHead: "rule" },
    themes: [
      { id: "fern", name: "Fern", accent: FERN, headingWeight: "bold", rule: "bar" },
      { id: "honey", name: "Honey", accent: HONEY, headingWeight: "bold", rule: "dotted" },
      { id: "ink", name: "Ink", accent: INK, headingWeight: "extrabold", rule: "bar" },
    ],
  },
  "research-report": {
    design: { typeface: "serif", align: "left", dropCap: false, chapterOpener: "rule", runningHead: "rule" },
    themes: [
      { id: "honey", name: "Honey", accent: HONEY_STRONG, headingWeight: "semibold", rule: "hairline" },
      { id: "ink", name: "Ink", accent: INK, headingWeight: "semibold", rule: "hairline" },
      { id: "teal", name: "Teal", accent: TEAL, headingWeight: "semibold", rule: "dotted" },
    ],
  },
  "course-companion": {
    design: { typeface: "sans", align: "left", dropCap: false, chapterOpener: "numeral", runningHead: "rule" },
    themes: [
      { id: "teal", name: "Teal", accent: TEAL, headingWeight: "bold", rule: "bar" },
      { id: "honey", name: "Honey", accent: HONEY, headingWeight: "bold", rule: "bar" },
      { id: "moss", name: "Moss", accent: MOSS, headingWeight: "semibold", rule: "hairline" },
    ],
  },
  "coloring-book": {
    design: { typeface: "sans", align: "left", dropCap: false, chapterOpener: "block", runningHead: "none" },
    themes: [
      { id: "teal", name: "Teal", accent: TEAL, headingWeight: "bold", rule: "bar" },
      { id: "honey", name: "Honey", accent: HONEY, headingWeight: "bold", rule: "bar" },
      { id: "moss", name: "Moss", accent: MOSS, headingWeight: "bold", rule: "hairline" },
    ],
  },
};

const FALLBACK = IDENTITIES["lead-magnet"];

export function designForFormat(formatSlug: string): BookDesign {
  return (IDENTITIES[formatSlug] ?? FALLBACK).design;
}

export function themesForFormat(formatSlug: string): BookTheme[] {
  return (IDENTITIES[formatSlug] ?? FALLBACK).themes;
}

/** Same book id → same theme, every time. No randomness at render. */
export function defaultThemeId(formatSlug: string, bookId: string): string {
  const themes = themesForFormat(formatSlug);
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = (hash * 31 + bookId.charCodeAt(i)) >>> 0;
  }
  return themes[hash % themes.length].id;
}

/** The theme a book should render with: its stored choice, else its default. */
export function resolveTheme(
  formatSlug: string,
  storedThemeId: string | null | undefined,
  bookId: string,
): { design: BookDesign; themes: BookTheme[]; theme: BookTheme } {
  const design = designForFormat(formatSlug);
  const themes = themesForFormat(formatSlug);
  const wanted = storedThemeId ?? defaultThemeId(formatSlug, bookId);
  const theme = themes.find((item) => item.id === wanted) ?? themes[0];
  return { design, themes, theme };
}
