import "server-only";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import type { BookDesign, BookTheme } from "@/lib/book-design";
import type { Block, BookDocument, DocumentChapter, Inline } from "@/lib/export/document";

/**
 * BookDocument → .epub (EPUB 3).
 *
 * Reflowable: the reader's device chooses the page size and the type size,
 * so nothing here is measured. The file carries the book's design as CSS —
 * serif or sans, justified or ragged, the accent on headings, the way a
 * chapter opens — with generic font families, so every reader renders it
 * with its own good fonts and the file stays small.
 *
 * Layout of the archive, as the standard wants it:
 *   mimetype                (first, stored uncompressed)
 *   META-INF/container.xml
 *   OEBPS/content.opf       package: metadata, manifest, spine
 *   OEBPS/nav.xhtml         table of contents
 *   OEBPS/cover.xhtml + images/cover.*   when the book has a cover
 *   OEBPS/title.xhtml, copyright.xhtml, chapter-N.xhtml, styles.css
 */

export const EPUB_MIME = "application/epub+zip";

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(value: string): string {
  return escape(value).replace(/'/g, "&#39;");
}

/* ---------------------------------------------------------------------------
   Inline runs and blocks → XHTML
--------------------------------------------------------------------------- */

function inlineHtml(inlines: Inline[]): string {
  return inlines
    .map((run) => {
      let html = escape(run.text).replace(/\n/g, "<br/>");
      if (run.code) html = `<code>${html}</code>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.href && /^https?:\/\//i.test(run.href)) html = `<a href="${attr(run.href)}">${html}</a>`;
      return html;
    })
    .join("");
}

function blockHtml(block: Block): string {
  switch (block.type) {
    case "heading": {
      // Chapter titles are h1; sections inside a chapter start at h2.
      const tag = block.level === 3 ? "h3" : "h2";
      return `<${tag}>${inlineHtml(block.inlines)}</${tag}>`;
    }
    case "paragraph":
      return `<p>${inlineHtml(block.inlines)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : "";
      return `<${tag}${start}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</${tag}>`;
    }
    case "quote":
      return `<blockquote>${block.paragraphs.map((p) => `<p>${inlineHtml(p)}</p>`).join("")}</blockquote>`;
    case "table": {
      const columns = Math.max(block.header.length, ...block.rows.map((row) => row.length), 1);
      const cell = (tag: "th" | "td", inlines: Inline[] | undefined, index: number) =>
        `<${tag} class="al-${block.align[index] ?? "left"}">${inlineHtml(inlines ?? [])}</${tag}>`;
      const head = `<thead><tr>${Array.from({ length: columns }, (_, i) => cell("th", block.header[i], i)).join("")}</tr></thead>`;
      const body = `<tbody>${block.rows
        .map((row) => `<tr>${Array.from({ length: columns }, (_, i) => cell("td", row[i], i)).join("")}</tr>`)
        .join("")}</tbody>`;
      return `<table>${head}${body}</table>`;
    }
    case "image":
      // Remote pictures are not fetched; the place is marked, as in the DOCX.
      return `<p class="image-note">[Image: ${escape(block.alt || "untitled")}]</p>`;
  }
}

/* ---------------------------------------------------------------------------
   Documents
--------------------------------------------------------------------------- */

function xhtml(title: string, body: string, language: string, bodyClass = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${attr(language)}" lang="${attr(language)}">
<head>
<meta charset="utf-8"/>
<title>${escape(title)}</title>
<link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${body}
</body>
</html>
`;
}

function chapterXhtml(chapter: DocumentChapter, doc: BookDocument, design: BookDesign): string {
  const opener = `<header class="opener opener-${design.chapterOpener}">
<p class="chapter-label">${design.chapterOpener === "banner" ? "Chapter" : `Chapter ${chapter.number}`}</p>
${design.chapterOpener === "banner" || design.chapterOpener === "numeral" ? `<p class="chapter-number">${chapter.number}</p>` : ""}
<h1>${escape(chapter.title)}</h1>
</header>`;
  const body = chapter.blocks.map(blockHtml).join("\n");
  return xhtml(chapter.title, `<section epub:type="chapter" class="chapter${design.dropCap ? " dropcap" : ""}">
${opener}
${body}
</section>`, doc.meta.language);
}

function titleXhtml(doc: BookDocument): string {
  const { title, subtitle, author } = doc.frontMatter.titlePage;
  return xhtml(
    title,
    `<section epub:type="titlepage" class="titlepage">
<h1 class="book-title">${escape(title)}</h1>
<hr class="rule"/>
${subtitle ? `<p class="book-subtitle">${escape(subtitle)}</p>` : ""}
${author ? `<p class="book-author">${escape(author)}</p>` : ""}
</section>`,
    doc.meta.language,
  );
}

function copyrightXhtml(doc: BookDocument): string {
  return xhtml(
    "Copyright",
    `<section epub:type="copyright-page" class="copyright">
${doc.frontMatter.copyright.lines.map((line) => `<p>${escape(line)}</p>`).join("\n")}
</section>`,
    doc.meta.language,
  );
}

function coverXhtml(doc: BookDocument, image: string): string {
  return xhtml(
    "Cover",
    `<section epub:type="cover" class="cover">
<img src="${attr(image)}" alt="${attr(`Cover of ${doc.meta.title}`)}"/>
</section>`,
    doc.meta.language,
    "cover-body",
  );
}

function navXhtml(doc: BookDocument, hasCover: boolean): string {
  const items = doc.chapters
    .map((chapter) => `<li><a href="chapter-${chapter.number}.xhtml">${escape(chapter.title)}</a></li>`)
    .join("\n");
  return xhtml(
    "Contents",
    `<nav epub:type="toc" id="toc">
<h1>Contents</h1>
<ol>
${items}
</ol>
</nav>
<nav epub:type="landmarks" hidden="hidden">
<ol>
${hasCover ? `<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>` : ""}
<li><a epub:type="titlepage" href="title.xhtml">Title page</a></li>
<li><a epub:type="toc" href="nav.xhtml">Contents</a></li>
${doc.chapters.length > 0 ? `<li><a epub:type="bodymatter" href="chapter-1.xhtml">Start of content</a></li>` : ""}
</ol>
</nav>`,
    doc.meta.language,
  );
}

/* ---------------------------------------------------------------------------
   Stylesheet — the design, in reflowable terms
--------------------------------------------------------------------------- */

function stylesheet(design: BookDesign, theme: BookTheme): string {
  const accent = theme.accent;
  const weight = theme.headingWeight === "semibold" ? 600 : theme.headingWeight === "bold" ? 700 : 800;
  const rule =
    theme.rule === "dotted"
      ? `border-top: 2px dotted ${accent};`
      : theme.rule === "bar"
        ? `border-top: 3px solid ${accent};`
        : `border-top: 1px solid ${accent}80;`;
  const body = design.typeface === "serif" ? "Georgia, 'Times New Roman', serif" : "'Helvetica Neue', Arial, sans-serif";
  const align = design.align === "justify" ? "text-align: justify; text-indent: 1.4em;" : "text-align: left; margin-bottom: 0.8em;";
  const onAccent = isLight(accent) ? "#111111" : "#ffffff";

  return `/* EbookStudio — ${design.typeface}, ${design.align}, ${design.chapterOpener} opener, ${theme.name} theme */
body { font-family: ${body}; line-height: 1.6; margin: 0; padding: 0 4%; color: #1f1f1f; }
body.cover-body { padding: 0; text-align: center; }
.cover img { max-width: 100%; max-height: 100vh; margin: 0 auto; }
h1, h2, h3 { font-family: ${design.typeface === "serif" ? body : "'Helvetica Neue', Arial, sans-serif"}; font-weight: ${weight}; line-height: 1.2; page-break-after: avoid; break-after: avoid; }
p { margin: 0; ${align} }
p + p { ${design.align === "justify" ? "margin-top: 0;" : ""} }
h2 { font-size: 1.25em; margin: 1.8em 0 0.5em; padding-top: 0.5em; ${rule} }
h3 { font-size: 1.05em; margin: 1.4em 0 0.4em; }
h2 + p, h3 + p, header + p { text-indent: 0; }
.opener { margin: 0 0 2em; page-break-before: always; break-before: page; }
.opener h1 { font-size: 1.7em; margin: 0.2em 0 0; }
.chapter-label { font-size: 0.7em; letter-spacing: 0.25em; text-transform: uppercase; color: ${accent}; text-indent: 0; text-align: left; margin: 2.5em 0 0; }
.chapter-number { font-size: 3.4em; font-weight: 800; line-height: 1; color: ${accent}; margin: 0; text-indent: 0; text-align: left; }
.opener-classic { text-align: center; }
.opener-classic .chapter-label, .opener-classic h1 { text-align: center; }
.opener-classic h1::after { content: ""; display: block; width: 2.4em; margin: 0.8em auto 0; ${rule} }
.opener-banner, .opener-block { background: ${accent}; color: ${onAccent}; padding: 1.2em 1em 1em; margin-left: -4%; margin-right: -4%; padding-left: 4%; padding-right: 4%; }
.opener-banner .chapter-label, .opener-banner .chapter-number, .opener-block .chapter-label { color: ${onAccent}; opacity: 0.85; margin-top: 0; }
.opener-banner h1, .opener-block h1 { color: ${onAccent}; }
.opener-numeral h1 { border-bottom: 3px solid ${accent}; padding-bottom: 0.4em; }
.opener-rule h1 { border-bottom: 1px solid ${accent}; padding-bottom: 0.5em; }
.dropcap header + p::first-letter { float: left; font-size: 3.2em; line-height: 0.85; padding: 0.05em 0.1em 0 0; color: ${accent}; font-weight: 600; }
blockquote { margin: 1.6em 1em; padding: 0.9em 0.5em; text-align: center; font-weight: ${weight}; color: ${accent}; font-size: 1.1em; border-top: 1px solid ${accent}60; border-bottom: 1px solid ${accent}60; }
blockquote p { text-indent: 0; text-align: center; margin: 0; }
ul, ol { margin: 0.8em 0 1em; padding-left: 1.4em; }
li { margin-bottom: 0.35em; }
li::marker { color: ${accent}; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin: 1.4em 0; font-size: 0.9em; }
th { background: ${accent}; color: ${onAccent}; text-align: left; padding: 0.4em 0.5em; font-size: 0.75em; letter-spacing: 0.08em; text-transform: uppercase; }
td { padding: 0.4em 0.5em; border-bottom: 1px solid ${accent}40; vertical-align: top; }
tbody tr:nth-child(even) td { background: ${accent}0d; }
.al-right { text-align: right; } .al-center { text-align: center; }
code { font-family: Menlo, Consolas, monospace; font-size: 0.9em; }
.image-note { font-style: italic; color: #6b6b6b; text-align: center; text-indent: 0; }
.titlepage { text-align: center; padding-top: 25vh; }
.book-title { font-size: 2em; margin: 0 0 0.5em; }
.rule { width: 3em; margin: 0 auto 1.2em; border: 0; ${rule} }
.book-subtitle { font-style: italic; color: #555; text-indent: 0; text-align: center; }
.book-author { margin-top: 3em; letter-spacing: 0.25em; text-transform: uppercase; font-size: 0.8em; color: ${accent}; text-indent: 0; text-align: center; }
.copyright { font-size: 0.8em; color: #666; text-align: center; padding-top: 55vh; }
.copyright p { text-indent: 0; text-align: center; margin-bottom: 0.6em; }
nav#toc h1 { font-size: 1.4em; text-align: center; margin-top: 2em; }
nav#toc ol { list-style: none; padding: 0; max-width: 30em; margin: 1.5em auto; }
nav#toc li { margin: 0.5em 0; }
nav#toc a { text-decoration: none; color: inherit; }
nav#toc li::marker { content: ""; }
`;
}

function isLight(hex: string) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

/* ---------------------------------------------------------------------------
   Package
--------------------------------------------------------------------------- */

function packageOpf(doc: BookDocument, id: string, cover: { file: string; type: string } | null, modified: string): string {
  const items: string[] = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="styles.css" media-type="text/css"/>`,
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`,
    ...doc.chapters.map(
      (chapter) => `<item id="chapter-${chapter.number}" href="chapter-${chapter.number}.xhtml" media-type="application/xhtml+xml"/>`,
    ),
  ];
  if (cover) {
    items.unshift(
      `<item id="cover-image" href="${cover.file}" media-type="${cover.type}" properties="cover-image"/>`,
      `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    );
  }
  const spine = [
    ...(cover ? [`<itemref idref="cover" linear="no"/>`] : []),
    `<itemref idref="title"/>`,
    `<itemref idref="copyright"/>`,
    `<itemref idref="nav"/>`,
    ...doc.chapters.map((chapter) => `<itemref idref="chapter-${chapter.number}"/>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${attr(doc.meta.language)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">urn:uuid:${id}</dc:identifier>
<dc:title>${escape(doc.meta.title)}</dc:title>
${doc.meta.author ? `<dc:creator id="creator">${escape(doc.meta.author)}</dc:creator>` : ""}
<dc:language>${escape(doc.meta.language)}</dc:language>
<dc:publisher>EbookStudio</dc:publisher>
<dc:rights>${escape(`Copyright © ${doc.meta.year} ${doc.meta.author || doc.meta.title}. All rights reserved.`)}</dc:rights>
${doc.meta.subtitle ? `<dc:description>${escape(doc.meta.subtitle)}</dc:description>` : ""}
<meta property="dcterms:modified">${modified}</meta>
${cover ? `<meta name="cover" content="cover-image"/>` : ""}
</metadata>
<manifest>
${items.join("\n")}
</manifest>
<spine>
${spine.join("\n")}
</spine>
</package>
`;
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>
`;

export async function renderEpub(doc: BookDocument, design: BookDesign, theme: BookTheme, now = new Date()): Promise<Buffer> {
  const zip = new JSZip();
  // The standard: "mimetype" first, uncompressed, so readers can sniff it.
  zip.file("mimetype", EPUB_MIME, { compression: "STORE" });
  zip.file("META-INF/container.xml", CONTAINER_XML);

  const cover = doc.cover
    ? { file: `images/cover.${doc.cover.type === "png" ? "png" : "jpg"}`, type: doc.cover.type === "png" ? "image/png" : "image/jpeg" }
    : null;
  if (cover && doc.cover) {
    zip.file(`OEBPS/${cover.file}`, doc.cover.data);
    zip.file("OEBPS/cover.xhtml", coverXhtml(doc, cover.file));
  }

  const modified = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  zip.file("OEBPS/content.opf", packageOpf(doc, randomUUID(), cover, modified));
  zip.file("OEBPS/nav.xhtml", navXhtml(doc, cover != null));
  zip.file("OEBPS/styles.css", stylesheet(design, theme));
  zip.file("OEBPS/title.xhtml", titleXhtml(doc));
  zip.file("OEBPS/copyright.xhtml", copyrightXhtml(doc));
  for (const chapter of doc.chapters) {
    zip.file(`OEBPS/chapter-${chapter.number}.xhtml`, chapterXhtml(chapter, doc, design));
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: EPUB_MIME });
}

export function epubFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "book"}.epub`;
}
