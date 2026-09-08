/**
 * Removes the typographic tells of machine writing from model output.
 *
 * Applied to every generated chapter just before it is saved, and to every
 * rewrite. NEVER applied to text the author typed or edited in the studio:
 * that is their text, dashes and all.
 *
 * Rules, in this order, on running text only:
 *   1. an enclosed aside  (text — aside — text)  → both dashes become commas
 *   2. a lone dash        (text — text)          → a comma when what follows
 *      starts lowercase, a colon when it starts with a capital or a digit
 *   3. whitespace left behind is normalised: never two spaces in a row
 *
 * Left untouched: fenced and inline code, markdown links and images, the
 * en dash inside a range or a compound (2019–2020, pre–war), and hyphens.
 */

const EM = "—";
const EN = "–";

/* Segments we must not edit: fenced code, inline code, images, links. */
const PROTECTED = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|!?\[[^\]\n]*\]\([^)\n]*\))/g;

/** A dash that is part of running text, as opposed to a range or a compound. */
function proseDash(text: string): string {
  // Any em dash is prose. An en dash is prose only when it has spaces around it;
  // glued to characters on both sides it is a range (5–7) or a compound.
  return text
    .replace(/[ \t]*—[ \t]*/g, ` ${EM} `)
    .replace(/[ \t]+–[ \t]+/g, ` ${EM} `);
}

function cleanSegment(text: string): string {
  let out = proseDash(text);

  // 1. Enclosed aside: text — aside — text. Only within one line, and only
  //    when the aside is short enough to be an aside rather than two breaks.
  out = out.replace(
    /(\S)[ \t]—[ \t]([^—\n]{1,120}?)[ \t]—[ \t](?=\S)/g,
    "$1, $2, ",
  );

  // 2. Lone dash: comma before a lowercase continuation, colon before a
  //    capital, a digit or an opening quote.
  out = out.replace(/[ \t]—[ \t](?=[\p{Ll}])/gu, ", ");
  out = out.replace(/[ \t]—[ \t](?=[\p{Lu}\p{N}"“'‘(])/gu, ": ");
  // A dash left at the end of a line or before punctuation is simply dropped.
  out = out.replace(/[ \t]—(?=[ \t]*(?:$|[.,;:!?)]))/gm, "");
  // Anything still standing (odd context) becomes a comma.
  out = out.replace(/[ \t]—[ \t]/g, ", ");

  // 3. Whitespace: no space before a comma or colon, never two spaces in a
  //    row (but leave leading indentation and line breaks alone).
  out = out.replace(/[ \t]+([,:])/g, "$1");
  out = out.replace(/,(?=,)/g, "");
  out = out.replace(/(\S)[ \t]{2,}/g, "$1 ");
  out = out.replace(/[ \t]+(?=\n)/g, "");
  return out;
}

/** Cleans model output. Safe on any markdown; idempotent. */
export function cleanModelText(markdown: string): string {
  if (!markdown) return markdown;
  const parts = markdown.split(PROTECTED);
  // split() with a capturing group alternates: text, protected, text, protected…
  return parts
    .map((part, index) => (index % 2 === 1 ? part : cleanSegment(part)))
    .join("");
}

/** True when running text still carries an em or en dash (for checks). */
export function countProseDashes(markdown: string): number {
  const text = markdown.split(PROTECTED).filter((_, i) => i % 2 === 0).join("");
  const em = (text.match(/—/g) ?? []).length;
  const en = (text.match(/[ \t]–[ \t]/g) ?? []).length;
  return em + en;
}
