import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import type { Extensions } from "@tiptap/core";

/**
 * The one extension set for chapter editing. The markdown in `chapters.body`
 * stays the source of truth: the editor loads it, and every save serialises
 * back to markdown through the same extensions, so parse and render always
 * agree.
 *
 * Only MIT packages here — no Tiptap Pro, no Content AI, no collaboration.
 */
export function chapterExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Chapters are prose, not web pages: no links or images in this pass.
      link: false,
      // The toolbar does not offer these, but a chapter that already contains
      // them must survive a load/save untouched, so they stay in the schema.
      codeBlock: {},
      horizontalRule: {},
      underline: false,
    }),
    // Chapters now carry comparison tables; without this they would be
    // flattened to text on the first save.
    TableKit,
    Markdown,
  ];
}
