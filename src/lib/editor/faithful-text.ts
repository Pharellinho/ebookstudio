import type { Editor } from "@tiptap/core";

/**
 * Keeps plain prose plain when the editor serialises back to markdown.
 *
 * Out of the box, @tiptap/markdown HTML-encodes text (`&` → `&amp;`) and
 * backslash-escapes every `* _ [ ] ~ \`` it meets, so "mint & thyme" or
 * "balcony_mix" come back changed even though nothing was edited. Those
 * rewrites are harmless to a markdown renderer but they are not the text the
 * author wrote, and a chapter that drifts on every save is a chapter that
 * slowly corrupts.
 *
 * This swaps in an encoder that escapes only what would otherwise change the
 * meaning when the markdown is parsed again:
 *   - `*` and `_` only where they could open or close emphasis
 *     (intraword `_` and space-padded `*` are literal in CommonMark);
 *   - backticks, and `~~` pairs;
 *   - `[` only when a `](` follows on the same line (a would-be link);
 *   - a backslash only before a punctuation character.
 * Text inside code is left untouched, as before.
 */
type TextNodeLike = { text?: string; marks?: Array<string | { type: string }> };
type ParentLike = { type?: string } | undefined;

const PUNCTUATION = /[!-/:-@[-`{-~]/;

function escapeProse(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : " ";
    const next = i + 1 < text.length ? text[i + 1] : " ";
    const prevWord = /[\p{L}\p{N}]/u.test(prev);
    const nextWord = /[\p{L}\p{N}]/u.test(next);
    const prevSpace = /\s/.test(prev);
    const nextSpace = /\s/.test(next);

    if (char === "\\" && PUNCTUATION.test(next)) {
      out += "\\\\";
    } else if (char === "`") {
      out += "\\`";
    } else if (char === "*") {
      // Space on both sides can never start or end emphasis.
      out += prevSpace && nextSpace ? "*" : "\\*";
    } else if (char === "_") {
      // Intraword underscores are literal; only flanking ones can emphasise.
      out += (prevWord && nextWord) || (prevSpace && nextSpace) ? "_" : "\\_";
    } else if (char === "~" && next === "~") {
      out += "\\~";
    } else if (char === "[" && /\]\(/.test(text.slice(i + 1))) {
      out += "\\[";
    } else {
      out += char;
    }
  }
  return out;
}

export function applyFaithfulTextEncoding(editor: Editor) {
  const manager = (editor as unknown as { markdown?: Record<string, unknown> }).markdown;
  if (!manager || typeof manager.encodeTextForMarkdown !== "function") return;

  const codeTypes = manager.codeTypes as Set<string> | undefined;
  manager.encodeTextForMarkdown = (
    text: string,
    node: TextNodeLike,
    parentNode: ParentLike,
  ) => {
    const inCodeBlock = parentNode?.type != null && codeTypes?.has(parentNode.type);
    const hasCodeMark = (node.marks ?? []).some((mark) =>
      codeTypes?.has(typeof mark === "string" ? mark : mark.type),
    );
    if (inCodeBlock || hasCodeMark) return text;
    return escapeProse(text);
  };
}
