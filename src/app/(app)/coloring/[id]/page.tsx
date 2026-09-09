import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ColoringPlan } from "@/components/app/coloring-plan";
import { getBookForUser } from "@/lib/books";
import { parseColoringSettings } from "@/lib/coloring";
import { listPages, type ColoringPageRow } from "@/lib/coloring-pages";
import { signCoverArt } from "@/lib/covers";
import { planAllowsColoring } from "@/lib/billing/plans";
import { loadBilling } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "Coloring book",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/coloring/[id]">;

/** The plan of a coloring book, page by page, before anything is drawn. */
export default async function ColoringBookPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) notFound();
  if (book.format_slug !== "coloring-book") redirect(`/studio/${book.id}`);

  const settings = parseColoringSettings(book.settings ?? null);
  const billing = await loadBilling(userId);

  /* Pages exist once drawing has started; before that the table may even
     be missing (migration 0013), which only means "not started". */
  let rows: ColoringPageRow[] = [];
  try {
    rows = await listPages(book.id);
  } catch (error) {
    if (!(error instanceof Error && error.message === "pages_table_missing")) throw error;
  }
  const pages = await Promise.all(
    rows.map(async ({ book_id: _book, ...row }) => ({ ...row, url: await signCoverArt(row.image_path) })),
  );
  const coverCandidates = await Promise.all(
    (book.cover_candidates ?? []).map(async (candidate) => ({ ...candidate, url: await signCoverArt(candidate.path) })),
  );

  return (
    <ColoringPlan
      bookId={book.id}
      title={book.title ?? book.outline?.title ?? "Untitled coloring book"}
      subtitle={book.subtitle ?? book.outline?.subtitle ?? ""}
      author={book.cover_author ?? ""}
      settings={settings && settings !== "invalid" ? settings : null}
      scenes={(book.outline?.chapters ?? []).map((chapter) => ({ scene: chapter.title, detail: chapter.summary }))}
      pages={pages}
      canExport={planAllowsColoring(billing.plan)}
      cover={{
        candidates: coverCandidates,
        chosen: book.cover_url ?? null,
        runs: book.cover_runs ?? 0,
        author: book.cover_author ?? "",
      }}
    />
  );
}
