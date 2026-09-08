import "server-only";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Content, PhrasingContent, Root, Table } from "mdast";
import { getBookForUser, listChapters, type BookRow, type ChapterRow } from "@/lib/books";
import { downloadCoverArt } from "@/lib/covers";

/**
 * The book as a document, before any file format.
 *
 * Every export (DOCX today, EPUB and PDF next) starts from this structure
 * and nothing else: metadata, the front matter every published book
 * carries, and the chapters cut into typed blocks. The chapters' markdown is
 * parsed exactly once, here, with remark; a format translator never sees
 * markdown, only blocks and inline runs.
 *
 * This module knows nothing about Word, EPUB or PDF and imports nothing
 * that does.
 */

export type BookMeta = {
  title: string;
  subtitle: string | null;
  author: string;
  /** BCP 47. Every book is written in English for now. */
  language: string;
  /** The year printed on the copyright page. */
  year: number;
};

/** A run of text with its emphasis. Links keep their text and their target. */
export type Inline = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
};

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: "paragraph"; inlines: Inline[] }
  | {
      type: "list";
      ordered: boolean;
      /** Ordered lists: the number the first item renders with. */
      start: number;
      /** Each item is one run of inlines; nested lists are flattened into it. */
      items: Inline[][];
    }
  | { type: "quote"; paragraphs: Inline[][] }
  | {
      type: "table";
      header: Inline[][];
      rows: Inline[][][];
      /** One entry per column. */
      align: ("left" | "center" | "right")[];
    }
  | { type: "image"; url: string; alt: string };

export type DocumentChapter = {
  number: number;
  title: string;
  blocks: Block[];
};

export type FrontMatter = {
  titlePage: { title: string; subtitle: string | null; author: string };
  /** One line each, in order. */
  copyright: { lines: string[] };
  contents: { entries: { number: number; title: string }[] };
};

/** The chosen cover, as bytes every format can embed. Null when there is none yet. */
export type CoverImage = { data: Buffer; type: "png" | "jpg" };

export type BookDocument = {
  meta: BookMeta;
  cover: CoverImage | null;
  frontMatter: FrontMatter;
  chapters: DocumentChapter[];
};

/* ---------------------------------------------------------------------------
   Markdown → blocks
--------------------------------------------------------------------------- */

const parser = unified().use(remarkParse).use(remarkGfm);

function parseMarkdown(markdown: string): Root {
  return parser.parse(markdown) as Root;
}

/** Flattens phrasing content into runs, carrying emphasis down the tree. */
function inlinesOf(nodes: PhrasingContent[], style: Omit<Inline, "text"> = {}): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push({ ...style, text: node.value });
        break;
      case "strong":
        out.push(...inlinesOf(node.children, { ...style, bold: true }));
        break;
      case "emphasis":
        out.push(...inlinesOf(node.children, { ...style, italic: true }));
        break;
      case "delete":
        out.push(...inlinesOf(node.children, style));
        break;
      case "inlineCode":
        out.push({ ...style, text: node.value, code: true });
        break;
      case "link":
        out.push(...inlinesOf(node.children, { ...style, href: node.url }));
        break;
      case "break":
        out.push({ ...style, text: "\n" });
        break;
      case "image":
        out.push({ ...style, text: node.alt ?? "" });
        break;
      case "html":
        // Raw HTML has no place in a book; keep the text if any.
        break;
      default:
        if ("children" in node && Array.isArray(node.children)) {
          out.push(...inlinesOf(node.children as PhrasingContent[], style));
        }
    }
  }
  return mergeInlines(out);
}

/** Adjacent runs with the same style become one. */
function mergeInlines(runs: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const run of runs) {
    if (run.text === "") continue;
    const last = merged[merged.length - 1];
    if (
      last &&
      last.bold === run.bold &&
      last.italic === run.italic &&
      last.code === run.code &&
      last.href === run.href
    ) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

/** The inlines of a container's paragraphs joined, one run per paragraph. */
function paragraphsOf(nodes: Content[]): Inline[][] {
  const out: Inline[][] = [];
  for (const node of nodes) {
    if (node.type === "paragraph") out.push(inlinesOf(node.children));
    else if (node.type === "list") {
      for (const item of node.children) out.push(...paragraphsOf(item.children as Content[]));
    } else if ("children" in node && Array.isArray(node.children)) {
      out.push(...paragraphsOf(node.children as Content[]));
    }
  }
  return out;
}

function tableBlock(node: Table): Block {
  const rows = node.children.map((row) => row.children.map((cell) => inlinesOf(cell.children)));
  const [header = [], ...body] = rows;
  const columns = Math.max(header.length, ...body.map((row) => row.length), 0);
  const align = Array.from({ length: columns }, (_, index) => {
    const value = node.align?.[index];
    return value === "center" || value === "right" ? value : "left";
  });
  return { type: "table", header, rows: body, align };
}

/**
 * The typed blocks of one chapter. Only what a book needs: headings,
 * paragraphs, lists, quotes, tables, images. Code fences become paragraphs
 * in a monospace run; rules and raw HTML are dropped.
 */
export function chapterBlocks(markdown: string): Block[] {
  const root = parseMarkdown(markdown);
  const blocks: Block[] = [];

  const visit = (node: Content) => {
    switch (node.type) {
      case "heading": {
        const level = node.depth <= 1 ? 1 : node.depth === 2 ? 2 : 3;
        blocks.push({ type: "heading", level, inlines: inlinesOf(node.children) });
        break;
      }
      case "paragraph": {
        // A paragraph that is only an image is an image block.
        const only = node.children.length === 1 ? node.children[0] : null;
        if (only && only.type === "image") {
          blocks.push({ type: "image", url: only.url, alt: only.alt ?? "" });
        } else {
          const inlines = inlinesOf(node.children);
          if (inlines.length > 0) blocks.push({ type: "paragraph", inlines });
        }
        break;
      }
      case "list": {
        const items = node.children.map((item) => {
          const runs = paragraphsOf(item.children as Content[]);
          // Paragraphs of one item are joined by a line break inside the item.
          return runs.flatMap((run, index) => (index === 0 ? run : [{ text: "\n" }, ...run]));
        });
        blocks.push({ type: "list", ordered: Boolean(node.ordered), start: node.start ?? 1, items });
        break;
      }
      case "blockquote": {
        const paragraphs = paragraphsOf(node.children as Content[]);
        if (paragraphs.length > 0) blocks.push({ type: "quote", paragraphs });
        break;
      }
      case "table":
        blocks.push(tableBlock(node));
        break;
      case "code":
        blocks.push({ type: "paragraph", inlines: [{ text: node.value, code: true }] });
        break;
      case "image":
        blocks.push({ type: "image", url: node.url, alt: node.alt ?? "" });
        break;
      case "thematicBreak":
      case "html":
      case "definition":
      case "footnoteDefinition":
      case "yaml":
        break;
      default:
        if ("children" in node && Array.isArray(node.children)) {
          for (const child of node.children as Content[]) visit(child);
        }
    }
  };

  for (const child of root.children) visit(child);
  return blocks;
}

/* ---------------------------------------------------------------------------
   Book → document
--------------------------------------------------------------------------- */

/** The copyright page. KDP asks publishers to disclose AI-assisted content; the line is here. */
export function copyrightLines(meta: BookMeta): string[] {
  const owner = meta.author || meta.title;
  return [
    `${meta.title}${meta.subtitle ? `: ${meta.subtitle}` : ""}`,
    `Copyright © ${meta.year} ${owner}. All rights reserved.`,
    "No part of this publication may be reproduced, stored or transmitted in any form without the prior written permission of the copyright holder, except for brief quotations in reviews.",
    "This book was written with the assistance of artificial intelligence and reviewed and edited by the author.",
    `First edition, ${meta.year}.`,
    "Produced with EbookStudio.",
  ];
}

/** Pure: the document for a book row and its chapters, ready chapters only, in order. */
export function bookDocumentFrom(
  book: BookRow,
  chapters: ChapterRow[],
  cover: CoverImage | null = null,
  now = new Date(),
): BookDocument {
  const meta: BookMeta = {
    title: book.title ?? book.outline?.title ?? "Untitled",
    subtitle: book.subtitle ?? book.outline?.subtitle ?? null,
    author: (book.cover_author ?? "").trim(),
    language: "en",
    year: now.getFullYear(),
  };

  const ready = chapters
    .filter((chapter) => chapter.status === "ready" && chapter.body.trim())
    .sort((a, b) => a.position - b.position);

  const documentChapters: DocumentChapter[] = ready.map((chapter, index) => ({
    number: index + 1,
    title: chapter.title,
    blocks: chapterBlocks(chapter.body),
  }));

  return {
    meta,
    cover,
    frontMatter: {
      titlePage: { title: meta.title, subtitle: meta.subtitle, author: meta.author },
      copyright: { lines: copyrightLines(meta) },
      contents: {
        entries: documentChapters.map((chapter) => ({ number: chapter.number, title: chapter.title })),
      },
    },
    chapters: documentChapters,
  };
}

/** The book's chosen cover from the private bucket, or null. Never throws: a missing picture is not a failed export. */
export async function loadCover(book: BookRow): Promise<CoverImage | null> {
  if (!book.cover_url) return null;
  try {
    const data = await downloadCoverArt(book.cover_url);
    if (!data) return null;
    const isPng = data.length > 8 && data[0] === 0x89 && data[1] === 0x50;
    return { data, type: isPng ? "png" : "jpg" };
  } catch (error) {
    console.error("cover download failed", error);
    return null;
  }
}

/**
 * The document for one of the user's books, or null when the book is not
 * theirs or does not exist — the same ownership rule as every route.
 */
export async function buildBookDocument(bookId: string, userId: string): Promise<BookDocument | null> {
  const book = await getBookForUser(bookId, userId);
  if (!book) return null;
  const [chapters, cover] = await Promise.all([listChapters(book.id), loadCover(book)]);
  return bookDocumentFrom(book, chapters, cover);
}
