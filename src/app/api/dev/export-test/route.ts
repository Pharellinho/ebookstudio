// TEMPORARY dev bench for the export: writes a book's DOCX to disk and can
// serve a local file back, so the result can be opened and looked at.
// Dev only: answers 404 in production. Delete after tuning.
import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme, themesForFormat, designForFormat } from "@/lib/book-design";
import { bookDocumentFrom, chapterBlocks, loadCover } from "@/lib/export/document";

const SAMPLE = `## A section with **bold**, *italic* and a [link](https://example.com)

First paragraph with \`inline code\` and a line that is long enough to wrap onto a second line in a six by nine page so we can see the leading.

Second paragraph, to check the space or the indent between paragraphs.

### A smaller heading

- First bullet point
- Second bullet with **bold** text
- Third bullet

3. An ordered list starting at three
4. Continues at four
5. And five

> A pulled quote that spans a little more than one line so its centring and its rules can be judged.

| Item | Cost | Note |
|---|---:|---|
| Coffee | 3.50 | Daily |
| Lunch | 12.00 | Weekdays only |

\`\`\`
const answer = 42;
\`\`\`

![A chart of growth](https://example.com/chart.png)

---

Last paragraph after a rule.`;
import { docxFileName, renderDocx } from "@/lib/export/docx";
import { pdfFileName, renderPdf } from "@/lib/export/pdf";
import { epubFileName, renderEpub } from "@/lib/export/epub";
import { packFileName, renderPack } from "@/lib/export/pack";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(request.url);

  // ?serve=/abs/path.pdf — hands a local file back, for the browser panel.
  const serve = url.searchParams.get("serve");
  if (serve) {
    const bytes = await readFile(serve);
    const type = serve.endsWith(".pdf")
      ? "application/pdf"
      : serve.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "application/octet-stream";
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": type, "Content-Disposition": "inline" } });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = url.searchParams.get("id");
  const out = url.searchParams.get("out") ?? "/tmp";
  // ?format=how-to-guide&theme=moss — try another identity on the same text.
  const formatSlug = url.searchParams.get("format");
  const themeId = url.searchParams.get("theme");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const book = await getBookForUser(id, userId);
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ?pdf=1 — the PDF through the same headless browser as the real route.
  if (url.searchParams.get("pdf") === "1") {
    const started = Date.now();
    const variant = url.searchParams.get("variant") === "print" ? "print" : "digital";
    const pdf = await renderPdf({ origin: url.origin, bookId: book.id, userId, variant });
    const path = `${out}/${pdfFileName(book.title ?? "book", variant === "print" ? "kdp-interior" : undefined)}`;
    await writeFile(path, pdf.file);
    return NextResponse.json({ path, bytes: pdf.file.byteLength, pages: pdf.pages, ms: Date.now() - started });
  }

  const [chapters, cover] = await Promise.all([listChapters(book.id), loadCover(book)]);
  const document = bookDocumentFrom(book, chapters, cover);
  // ?only=6 keeps one chapter and drops the front matter, so a Quick Look
  // thumbnail (first page only) shows that chapter's opener and blocks.
  const only = Number(url.searchParams.get("only"));
  if (only > 0) {
    document.chapters = document.chapters.filter((chapter) => chapter.number === only);
    document.frontMatter.contents.entries = [];
  }
  // ?kinds=quote,table keeps only those block types, so they land at the top.
  const kinds = url.searchParams.get("kinds")?.split(",").filter(Boolean);
  if (kinds?.length) {
    for (const chapter of document.chapters) {
      chapter.blocks = chapter.blocks.filter((block) => kinds.includes(block.type));
    }
  }
  // ?sample=1 swaps the first chapter's blocks for a markdown sample that
  // exercises lists, code, links, emphasis and an image placeholder.
  if (url.searchParams.get("sample") === "1" && document.chapters[0]) {
    document.chapters[0].blocks = chapterBlocks(SAMPLE);
  }

  const design = formatSlug ? designForFormat(formatSlug) : resolveTheme(book.format_slug, book.theme, book.id).design;
  const themes = themesForFormat(formatSlug ?? book.format_slug);
  const theme =
    (themeId ? themes.find((item) => item.id === themeId) : undefined) ??
    resolveTheme(book.format_slug, book.theme, book.id).theme;

  // ?pack=1 — the whole book pack, one folder per platform.
  if (url.searchParams.get("pack") === "1") {
    const started = Date.now();
    const pack = await renderPack({ origin: url.origin, document, book, userId });
    const path = `${out}/${packFileName(document.meta.title)}`;
    await writeFile(path, pack.file);
    return NextResponse.json({ path, bytes: pack.file.byteLength, pages: pack.pages, files: pack.files, ms: Date.now() - started });
  }

  // ?epub=1 — the EPUB instead of the DOCX.
  if (url.searchParams.get("epub") === "1") {
    const epub = await renderEpub(document, design, theme);
    const path = `${out}/${formatSlug ?? book.format_slug}-${theme.id}-${epubFileName(document.meta.title)}`;
    await writeFile(path, epub);
    return NextResponse.json({ path, bytes: epub.byteLength, chapters: document.chapters.length, cover: Boolean(document.cover) });
  }

  const file = await renderDocx(document, design, theme, { frontMatter: url.searchParams.get("front") !== "0" });
  const name = `${formatSlug ?? book.format_slug}-${theme.id}${only > 0 ? `-ch${only}` : ""}-${docxFileName(document.meta.title)}`;
  const path = `${out}/${name}`;
  await writeFile(path, file);

  return NextResponse.json({
    path,
    bytes: file.byteLength,
    chapters: document.chapters.length,
    cover: document.cover ? `${document.cover.type}, ${document.cover.data.length} bytes` : null,
    blocks: document.chapters.map((chapter) => {
      const kinds: Record<string, number> = {};
      for (const block of chapter.blocks) kinds[block.type] = (kinds[block.type] ?? 0) + 1;
      return { title: chapter.title, ...kinds };
    }),
    copyright: document.frontMatter.copyright.lines,
  });
}
