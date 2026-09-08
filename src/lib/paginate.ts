/**
 * Pagination of a chapter's markdown into pages.
 *
 * Two halves, deliberately separated so the PDF export can reuse the first
 * with a different measurer:
 *
 * 1. `splitBlocks(markdown)` — pure. Cuts markdown into blocks that may not
 *    be divided across pages: paragraphs, headings, list items, one table,
 *    one blockquote, one code fence, one rule. No DOM, no React.
 *
 * 2. `packPages(measured, capacities)` — pure. Given the vertical extent of
 *    every block as laid out in one continuous column (the caller measures
 *    that, in the browser or elsewhere), decides where the pages break:
 *    always between blocks, a heading never orphaned at the foot of a page,
 *    a block taller than a page set alone on its own page.
 *
 * `splitOversize(block)` breaks a table or a code fence that cannot fit one
 * page into smaller blocks (rows, lines); a paragraph is never split.
 *
 * Determinism: the same markdown, the same measurements and the same
 * capacities always give the same pages. There is no randomness and no
 * dependence on time.
 */

export type BlockKind =
  | "p"
  | "h"
  | "li"
  | "quote"
  | "table"
  | "code"
  | "hr";

export type Block = {
  kind: BlockKind;
  /** The markdown of this block alone, renderable on its own. */
  markdown: string;
  /** Headings: 1–6. */
  level?: number;
  /** List items: ordered lists carry the number this item renders with. */
  ordered?: boolean;
  start?: number;
};

const FENCE = /^(```|~~~)/;
const HEADING = /^(#{1,6})\s+\S/;
const HR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET = /^([-*+])\s+(.*)$/;
const NUMBERED = /^(\d{1,9})[.)]\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const QUOTE = /^>\s?/;
const CONTINUATION = /^(?: {2,}|\t)\S/;

function isBlank(line: string) {
  return line.trim() === "";
}

/**
 * Cuts markdown into blocks that must each stay whole on a page.
 * Blank lines separate blocks; list items are blocks of their own so a long
 * list can flow across pages; a table, a blockquote and a fenced code block
 * each stay together (see `splitOversize` when they cannot fit at all).
 */
export function splitBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // Fenced code: everything up to the closing fence, whatever it contains.
    if (FENCE.test(line)) {
      const fence = line.match(FENCE)![1];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(fence)) j += 1;
      blocks.push({ kind: "code", markdown: lines.slice(i, Math.min(j + 1, lines.length)).join("\n") });
      i = j + 1;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ kind: "hr", markdown: line.trim() });
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ kind: "h", level: heading[1].length, markdown: line.trim() });
      i += 1;
      continue;
    }

    // Table: a header row, its rule, then rows until a blank line.
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1])) {
      let j = i + 2;
      while (j < lines.length && !isBlank(lines[j]) && lines[j].includes("|")) j += 1;
      blocks.push({ kind: "table", markdown: lines.slice(i, j).join("\n") });
      i = j;
      continue;
    }

    if (QUOTE.test(line)) {
      let j = i;
      while (j < lines.length && !isBlank(lines[j]) && QUOTE.test(lines[j])) j += 1;
      blocks.push({ kind: "quote", markdown: lines.slice(i, j).join("\n") });
      i = j;
      continue;
    }

    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);
    if (bullet || numbered) {
      // One list: consecutive items, each with its indented continuation
      // lines. Blank lines inside a list are tolerated only between items.
      const ordered = Boolean(numbered);
      let number = numbered ? Number(numbered[1]) : 0;
      let j = i;
      while (j < lines.length) {
        const head = lines[j];
        const item = ordered ? head.match(NUMBERED) : head.match(BULLET);
        if (!item) break;
        let k = j + 1;
        while (k < lines.length && (CONTINUATION.test(lines[k]) || (isBlank(lines[k]) && k + 1 < lines.length && CONTINUATION.test(lines[k + 1])))) k += 1;
        const body = lines.slice(j, k).join("\n").replace(/\n+$/, "");
        blocks.push(
          ordered
            ? { kind: "li", ordered: true, start: number, markdown: body.replace(NUMBERED, `${number}. $2`) }
            : { kind: "li", ordered: false, markdown: body },
        );
        number += 1;
        j = k;
        // A single blank line between two items keeps the list going.
        if (j < lines.length && isBlank(lines[j]) && j + 1 < lines.length) {
          const next = ordered ? NUMBERED.test(lines[j + 1]) : BULLET.test(lines[j + 1]);
          if (next) j += 1;
        }
      }
      i = j;
      continue;
    }

    // Paragraph: consecutive non-blank lines that start nothing else.
    let j = i + 1;
    while (
      j < lines.length &&
      !isBlank(lines[j]) &&
      !HEADING.test(lines[j]) &&
      !FENCE.test(lines[j]) &&
      !HR.test(lines[j]) &&
      !QUOTE.test(lines[j]) &&
      !BULLET.test(lines[j]) &&
      !NUMBERED.test(lines[j]) &&
      !(TABLE_ROW.test(lines[j]) && j + 1 < lines.length && TABLE_RULE.test(lines[j + 1]))
    ) {
      j += 1;
    }
    blocks.push({ kind: "p", markdown: lines.slice(i, j).join("\n").trim() });
    i = j;
  }

  return blocks;
}

/**
 * Breaks a block that cannot fit on one page into smaller blocks. A table
 * splits into runs of rows, each under the same header; a code fence into
 * runs of lines. Anything else comes back unchanged: a paragraph is never
 * cut, it is set alone on a page and clipped if it is truly too long.
 */
export function splitOversize(block: Block, rowsPerPiece = 8): Block[] {
  if (block.kind === "table") {
    const lines = block.markdown.split("\n");
    // A single row cannot be split further; the page will clip it.
    if (lines.length <= 3 || lines.length <= 2 + rowsPerPiece) return [block];
    const header = lines.slice(0, 2);
    const rows = lines.slice(2);
    const pieces: Block[] = [];
    for (let i = 0; i < rows.length; i += rowsPerPiece) {
      pieces.push({ kind: "table", markdown: [...header, ...rows.slice(i, i + rowsPerPiece)].join("\n") });
    }
    return pieces;
  }
  if (block.kind === "code") {
    const lines = block.markdown.split("\n");
    if (lines.length <= 2 + rowsPerPiece * 2) return [block];
    const open = lines[0];
    const close = lines[lines.length - 1];
    const body = lines.slice(1, -1);
    const pieces: Block[] = [];
    for (let i = 0; i < body.length; i += rowsPerPiece * 2) {
      pieces.push({ kind: "code", markdown: [open, ...body.slice(i, i + rowsPerPiece * 2), close].join("\n") });
    }
    return pieces;
  }
  return [block];
}

/** A block as laid out in one continuous column: where it starts and ends. */
export type MeasuredBlock = {
  kind: BlockKind;
  /** Distance from the column's top to the block's top edge (its own top margin excluded). */
  top: number;
  /** Distance from the column's top to the block's bottom edge. */
  bottom: number;
};

export type PageCapacities = {
  /** Room for blocks on the chapter's first page, under its opener. */
  first: number;
  /** Room for blocks on every following page, under the running head. */
  rest: number;
};

/**
 * Decides the page breaks: an array of [firstBlock, lastBlock] index pairs,
 * one per page, covering every block in order.
 *
 * A page starts at a block's top edge (its own top margin is dropped, as the
 * page renderer does with `first-child`). A block fits if its bottom edge
 * is within the page's capacity from that origin. A heading that would end a
 * page is moved to the next one, unless it is the only block on the page.
 */
export function packPages(measured: MeasuredBlock[], capacities: PageCapacities): [number, number][] {
  const pages: [number, number][] = [];
  if (measured.length === 0) return pages;

  let start = 0;
  while (start < measured.length) {
    const capacity = pages.length === 0 ? capacities.first : capacities.rest;
    const origin = measured[start].top;
    let end = start;
    while (end + 1 < measured.length && measured[end + 1].bottom - origin <= capacity) end += 1;
    // The first block always goes on, even if it overflows: never an empty page.
    if (measured[end].bottom - origin > capacity && end > start) end -= 1;
    // No heading stranded at the foot of a page.
    while (end > start && measured[end].kind === "h" && end + 1 < measured.length) end -= 1;
    pages.push([start, end]);
    start = end + 1;
  }
  return pages;
}

/** Blocks taller than the roomiest page, which `splitOversize` may help with. */
export function oversizeBlocks(measured: MeasuredBlock[], capacities: PageCapacities): number[] {
  const room = Math.max(capacities.first, capacities.rest);
  const out: number[] = [];
  measured.forEach((block, index) => {
    if (block.bottom - block.top > room) out.push(index);
  });
  return out;
}
