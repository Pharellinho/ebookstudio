import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { StudioReader } from "@/components/app/studio-reader";
import { getBookForUser, listChapters } from "@/lib/books";

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

  return (
    <StudioReader
      bookId={book.id}
      title={book.title ?? "Untitled book"}
      subtitle={book.subtitle}
      idea={book.idea}
      status={book.status}
      chapters={chapters.map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
        title: chapter.title,
        body: chapter.body,
      }))}
    />
  );
}
