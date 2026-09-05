/**
 * The one definition of "a paragraph" shared by the studio (which renders and
 * indexes them) and the rewrite route (which replaces one by index). Both
 * sides must split the same way or an index would point at the wrong text.
 *
 * A paragraph is a block of Markdown separated by a blank line. Headings and
 * lists count as their own blocks.
 */
export function splitParagraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

export function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}
