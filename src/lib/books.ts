import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
  status?: BookRow["status"];
}): Promise<BookRow> {
  const { data, error } = await admin()
    .from("books")
    .insert({
      user_id: input.userId,
      idea: input.idea,
      format_slug: input.formatSlug,
      title: input.title ?? null,
      subtitle: input.subtitle ?? null,
      outline: input.outline ?? null,
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

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
  }>,
): Promise<void> {
  const { error } = await admin()
    .from("books")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", bookId);

  if (error) throw new Error(error.message);
}

export async function replaceOutlineChapters(
  bookId: string,
  outline: BookOutline,
): Promise<ChapterRow[]> {
  const supabase = admin();
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
