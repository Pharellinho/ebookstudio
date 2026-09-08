import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBook } from "@/components/book/print-book";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme } from "@/lib/book-design";
import { signCoverArt } from "@/lib/covers";
import { readPrintToken } from "@/lib/export/print-token";

export const metadata: Metadata = {
  title: "Print",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/print/[id]">;

/**
 * The page the PDF export photographs. No session here: it opens only with
 * a signed, short-lived token that names one book for one user, minted by
 * the export route a moment earlier. Everything else is "not found".
 */
export default async function PrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const raw = typeof query.t === "string" ? query.t : "";
  const variant = query.variant === "print" ? "print" : "digital";
  const token = raw ? readPrintToken(raw) : null;
  if (!token || token.bookId !== id) notFound();

  const book = await getBookForUser(token.bookId, token.userId);
  if (!book) notFound();

  const chapters = await listChapters(book.id);
  const { design, theme } = resolveTheme(book.format_slug, book.theme, book.id);
  const chosen = (book.cover_candidates ?? []).find((candidate) => candidate.path === book.cover_url) ?? null;

  return (
    <PrintBook
      variant={variant}
      bookTitle={book.title ?? "Untitled book"}
      subtitle={book.subtitle}
      author={book.cover_author ?? ""}
      coverUrl={chosen ? await signCoverArt(chosen.path) : null}
      design={design}
      theme={theme}
      chapters={chapters
        .filter((chapter) => chapter.status === "ready")
        .map((chapter) => ({ id: chapter.id, title: chapter.title, markdown: chapter.body }))}
    />
  );
}
