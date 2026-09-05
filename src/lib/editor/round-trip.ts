import { Editor } from "@tiptap/core";
import { chapterExtensions } from "@/lib/editor/chapter-extensions";
import { applyFaithfulTextEncoding } from "@/lib/editor/faithful-text";

/**
 * Loads markdown into a headless editor and serialises it straight back.
 * Used by the manual fidelity check: an editor whose "load, save, touch
 * nothing" cycle changes the markdown would corrupt books silently.
 */
export function roundTripMarkdown(markdown: string): string {
  const editor = new Editor({
    extensions: chapterExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  applyFaithfulTextEncoding(editor);
  try {
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
}

/** First differing line, for a readable report. */
export function firstDifference(a: string, b: string) {
  const left = a.split("\n");
  const right = b.split("\n");
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    if (left[i] !== right[i]) {
      return { line: i + 1, before: left[i] ?? "(missing)", after: right[i] ?? "(missing)" };
    }
  }
  return null;
}
