import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { listBooksForUser } from "@/lib/books";
import { getFormat } from "@/lib/generation/prompts";

export const metadata: Metadata = {
  title: "My eBooks",
  robots: { index: false, follow: false },
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  outlining: "Outlining",
  writing: "Writing",
  ready: "Ready",
  failed: "Failed",
};

export default async function BooksPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const books = await listBooksForUser(profile.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            My eBooks
          </h1>
          <p className="mt-2 text-muted-foreground">
            All drafts and finished books in one place.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary shadow-sm"
        >
          <Plus className="size-4" aria-hidden="true" />
          New ebook
        </Link>
      </div>

      {books.length === 0 ? (
        <Link
          href="/create"
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/30 bg-background p-10 text-center"
        >
          <p className="font-display text-lg font-semibold">No books yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first lead magnet in a few minutes.
          </p>
        </Link>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const format = getFormat(book.format_slug);
            const href =
              book.status === "ready"
                ? `/studio/${book.id}`
                : `/create?idea=${encodeURIComponent(book.idea)}`;

            return (
              <Link
                key={book.id}
                href={href}
                className="flex flex-col rounded-2xl border-2 border-border bg-background p-5 transition-all hover:border-foreground hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {format?.name ?? book.format_slug}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      book.status === "ready"
                        ? "border-foreground bg-primary/20"
                        : book.status === "failed"
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border bg-muted"
                    }`}
                  >
                    {statusLabel[book.status] ?? book.status}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-bold line-clamp-2">
                  {book.title ?? "Untitled draft"}
                </h2>
                <p className="mt-2 flex-1 line-clamp-3 text-sm text-muted-foreground">
                  {book.subtitle ?? book.idea}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {new Date(book.updated_at).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
