import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { BookPreview } from "@/components/app/book-preview";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme } from "@/lib/book-design";
import { signCoverArt } from "@/lib/covers";
import { planAllowsExport } from "@/lib/billing/plans";
import { loadBilling } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/studio/[id]/preview">;

/**
 * The book as a book: cover to last page, turned like on the landing.
 * The step after the studio, and the one before choosing a format.
 */
export default async function PreviewPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) notFound();

  const [chapters, billing] = await Promise.all([listChapters(book.id), loadBilling(userId)]);
  const { design, themes, theme } = resolveTheme(book.format_slug, book.theme, book.id);
  const chosen = (book.cover_candidates ?? []).find((candidate) => candidate.path === book.cover_url) ?? null;

  return (
    <BookPreview
      bookId={book.id}
      title={book.title ?? "Untitled book"}
      subtitle={book.subtitle}
      author={book.cover_author ?? ""}
      coverUrl={chosen ? await signCoverArt(chosen.path) : null}
      design={design}
      themes={themes}
      initialThemeId={theme.id}
      canExport={planAllowsExport(billing.plan)}
      chapters={chapters
        .filter((chapter) => chapter.status === "ready")
        .map((chapter) => ({
          id: chapter.id,
          position: chapter.position,
          title: chapter.title,
          body: chapter.body,
        }))}
    />
  );
}
