import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { defaultThemeId, themesForFormat } from "@/lib/book-design";
import type { CoverCandidate } from "@/lib/cover-rules";
import type { BookOutline } from "@/lib/generation/prompts";

export type BookRow = {
  id: string;
  user_id: string;
  idea: string;
  format_slug: string;
  title: string | null;
  subtitle: string | null;
  status: "draft" | "outlining" | "writing" | "ready" | "failed";
  outline: BookOutline | null;
  cover_url: string | null;
  error: string | null;
  /** Interior accent colour (#rrggbb). Absent until migration 0008 has run. */
  accent?: string | null;
  /** Chosen interior theme id. Absent until migration 0009 has run; null = default. */
  theme?: string | null;
  /** Legacy columns from migration 0010; unused since full covers replaced the composed ones. */
  cover_art_url?: string | null;
  cover_layout?: string | null;
  cover_art_count?: number | null;
  cover_author?: string | null;
  /** Every generated cover (paths in the private bucket), migration 0011. */
  cover_candidates?: CoverCandidate[] | null;
  /** Three-cover runs spent on this book. */
  cover_runs?: number | null;
  created_at: string;
  updated_at: string;
};

export type ChapterRow = {
  id: string;
  book_id: string;
  position: number;
  title: string;
  body: string;
  status: "pending" | "writing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

function admin() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function createBook(input: {
  userId: string;
  idea: string;
  formatSlug: string;
  title?: string | null;
  subtitle?: string | null;
  outline?: BookOutline | null;
  /** The name drawn on the cover; null when the author has not said. */
  coverAuthor?: string | null;
  status?: BookRow["status"];
}): Promise<BookRow> {
  /* The id is minted here rather than by the database so the interior theme
     can be derived from it before the insert — same id, same theme, always. */
  const id = randomUUID();
  const themeId = defaultThemeId(input.formatSlug, id);
  const accent =
    themesForFormat(input.formatSlug).find((theme) => theme.id === themeId)?.accent ??
    themesForFormat(input.formatSlug)[0].accent;

  type BookInsert = {
    id: string;
    user_id: string;
    idea: string;
    format_slug: string;
    title: string | null;
    subtitle: string | null;
    outline: BookOutline | null;
    status: BookRow["status"];
    accent?: string;
    theme?: string;
    cover_author?: string | null;
  };
  const base: BookInsert = {
    id,
    user_id: input.userId,
    idea: input.idea,
    format_slug: input.formatSlug,
    title: input.title ?? null,
    subtitle: input.subtitle ?? null,
    outline: input.outline ?? null,
    status: input.status ?? "draft",
  };

  const insert = (row: BookInsert) =>
    admin().from("books").insert(row).select("*").single();

  /* Until migrations 0008/0009 have been applied the columns do not exist.
     Creating a book must keep working meanwhile: drop the missing column and
     try again; the values are then derived at read time. */
  const withAuthor = input.coverAuthor ? { cover_author: input.coverAuthor } : {};
  let { data, error } = await insert({ ...base, ...withAuthor, accent, theme: themeId });
  if (error && /cover_author/i.test(error.message)) {
    console.warn("books.cover_author column missing — run supabase/migrations/0010_book_covers.sql");
    ({ data, error } = await insert({ ...base, accent, theme: themeId }));
  }
  if (error && /theme/i.test(error.message)) {
    console.warn("books.theme column missing — run supabase/migrations/0009_books_theme.sql");
    ({ data, error } = await insert({ ...base, accent }));
  }
  if (error && /accent/i.test(error.message)) {
    console.warn("books.accent column missing — run supabase/migrations/0008_books_accent.sql");
    ({ data, error } = await insert(base));
  }

  if (error || !data) throw new Error(error?.message ?? "Failed to create book");
  return data as BookRow;
}

export async function getBookForUser(
  bookId: string,
  userId: string,
): Promise<BookRow | null> {
  const { data, error } = await admin()
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as BookRow | null) ?? null;
}

export async function listChapters(bookId: string): Promise<ChapterRow[]> {
  const { data, error } = await admin()
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ChapterRow[]) ?? [];
}

export async function updateBook(
  bookId: string,
  patch: Partial<{
    title: string | null;
    subtitle: string | null;
    status: BookRow["status"];
    outline: BookOutline | null;
    cover_url: string | null;
    error: string | null;
    accent: string;
    theme: string;
    cover_author: string | null;
    cover_candidates: CoverCandidate[];
  }>,
): Promise<void> {
  const { error } = await admin()
    .from("books")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", bookId);

  if (error) throw new Error(error.message);
}

/** Bumps updated_at so a generation in progress never looks abandoned. */
export async function touchBook(bookId: string): Promise<void> {
  const { error } = await admin()
    .from("books")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", bookId);

  if (error) throw new Error(error.message);
}

/**
 * Lines the chapters table up with the outline. Chapters that already hold
 * finished text are kept, so retrying a book that died halfway resumes instead
 * of paying OpenAI a second time for work that was already delivered.
 */
export async function syncOutlineChapters(
  bookId: string,
  outline: BookOutline,
): Promise<ChapterRow[]> {
  const supabase = admin();
  const existing = await listChapters(bookId);

  const samePlan =
    existing.length === outline.chapters.length &&
    existing.every(
      (chapter, index) =>
        chapter.position === index &&
        chapter.title === outline.chapters[index].title,
    );

  if (samePlan) {
    const unfinished = existing.filter(
      (chapter) => chapter.status !== "ready" || !chapter.body.trim(),
    );
    const unfinishedIds = new Set(unfinished.map((chapter) => chapter.id));

    for (const chapter of unfinished) {
      await updateChapter(chapter.id, { status: "pending", body: "" });
    }

    return existing.map((chapter) =>
      unfinishedIds.has(chapter.id)
        ? { ...chapter, status: "pending" as const, body: "" }
        : chapter,
    );
  }

  // The outline changed, so the old chapters no longer describe this book.
  await supabase.from("chapters").delete().eq("book_id", bookId);

  const rows = outline.chapters.map((chapter, index) => ({
    book_id: bookId,
    position: index,
    title: chapter.title,
    body: "",
    status: "pending" as const,
  }));

  const { data, error } = await supabase
    .from("chapters")
    .insert(rows)
    .select("*")
    .order("position", { ascending: true });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create chapters");
  }

  return data as ChapterRow[];
}

/** One chapter by id. Callers must check `book_id` against a book the user owns. */
export async function getChapter(chapterId: string): Promise<ChapterRow | null> {
  const { data, error } = await admin()
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ChapterRow | null) ?? null;
}

export async function updateChapter(
  chapterId: string,
  patch: Partial<{
    title: string;
    body: string;
    status: ChapterRow["status"];
  }>,
): Promise<void> {
  const { error } = await admin()
    .from("chapters")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (error) throw new Error(error.message);
}

/**
 * Spends one of the book's cover runs before any model call. The update only
 * succeeds if the count is still what we read, so two requests racing for the
 * last run cannot both get it, and a run that fails after this point has
 * still been spent — the cap is strict.
 */
export async function reserveCoverRun(
  bookId: string,
  currentRuns: number,
  cap: number,
): Promise<boolean> {
  if (currentRuns >= cap) return false;
  const { data, error } = await admin()
    .from("books")
    .update({ cover_runs: currentRuns + 1, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("cover_runs", currentRuns)
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/**
 * Deletes a book and, by cascade, its chapters. The owner filter is part of
 * the DELETE itself, so even a caller that skipped the ownership check could
 * not remove someone else's book. Returns false when nothing matched.
 */
export async function deleteBookForUser(
  bookId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin()
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", userId)
    .select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function listBooksForUser(
  userId: string,
  limit = 50,
): Promise<BookRow[]> {
  const { data, error } = await admin()
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as BookRow[]) ?? [];
}

export type UserBookStats = {
  totalBooks: number;
  chaptersGenerated: number;
  wordsWritten: number;
  readyBooks: number;
};

export async function getUserBookStats(userId: string): Promise<UserBookStats> {
  const books = await listBooksForUser(userId, 200);
  if (books.length === 0) {
    return {
      totalBooks: 0,
      chaptersGenerated: 0,
      wordsWritten: 0,
      readyBooks: 0,
    };
  }

  const bookIds = books.map((book) => book.id);
  const { data: chapters, error } = await admin()
    .from("chapters")
    .select("body, status, book_id")
    .in("book_id", bookIds);

  if (error) throw new Error(error.message);

  const chapterRows = chapters ?? [];
  const readyChapters = chapterRows.filter((chapter) => chapter.status === "ready");
  const wordsWritten = readyChapters.reduce((sum, chapter) => {
    const body = typeof chapter.body === "string" ? chapter.body : "";
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    return sum + words;
  }, 0);

  return {
    totalBooks: books.length,
    chaptersGenerated: readyChapters.length,
    wordsWritten,
    readyBooks: books.filter((book) => book.status === "ready").length,
  };
}
