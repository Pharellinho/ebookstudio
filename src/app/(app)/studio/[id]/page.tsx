import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { StudioReader } from "@/components/app/studio-reader";
import { getBookForUser, listChapters } from "@/lib/books";
import { resolveTheme } from "@/lib/book-design";
import { signCoverArt } from "@/lib/covers";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/studio/[id]">;

export default async function StudioPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) notFound();

  const chapters = await listChapters(book.id);
  const { design, themes, theme } = resolveTheme(book.format_slug, book.theme, book.id);
  const coverCandidates = await Promise.all(
    (book.cover_candidates ?? []).map(async (candidate) => ({
      ...candidate,
      url: await signCoverArt(candidate.path),
    })),
  );

  return (
    <StudioReader
      bookId={book.id}
      title={book.title ?? "Untitled book"}
      subtitle={book.subtitle}
      idea={book.idea}
      status={book.status}
      design={design}
      themes={themes}
      initialThemeId={theme.id}
      cover={{
        candidates: coverCandidates,
        chosen: book.cover_url ?? null,
        runs: book.cover_runs ?? 0,
        author: book.cover_author ?? "",
      }}
      chapters={chapters.map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
        title: chapter.title,
        body: chapter.body,
      }))}
    />
  );
}
