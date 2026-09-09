import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { COVER_BUCKET } from "@/lib/covers";

/**
 * Reads and writes for the pages of a coloring book (migration 0013).
 * Pictures live in the private covers bucket, under <user>/<book>/pages/,
 * and are reached through signed URLs like the covers.
 */

export type ColoringPageRow = {
  id: string;
  book_id: string;
  position: number;
  scene: string;
  detail: string;
  status: "pending" | "drawing" | "ready" | "failed";
  image_path: string | null;
  redraws: number;
  stale: boolean;
  created_at: string;
  updated_at: string;
};

/** How many times one page may be drawn again. */
export const PAGE_REDRAW_CAP = 3;

function admin() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

function missingTable(message: string) {
  return /coloring_pages/i.test(message) && /not exist|schema cache|relation/i.test(message);
}

export async function listPages(bookId: string): Promise<ColoringPageRow[]> {
  const { data, error } = await admin()
    .from("coloring_pages")
    .select("*")
    .eq("book_id", bookId)
    .order("position", { ascending: true });
  if (error) {
    if (missingTable(error.message)) throw new Error("pages_table_missing");
    throw new Error(error.message);
  }
  return (data ?? []) as ColoringPageRow[];
}

/**
 * Makes the rows match the plan: one per scene, in order. A page whose line
 * changed after it was drawn keeps its picture but is marked stale; rows
 * past the end of the plan are dropped.
 */
export async function syncPages(
  bookId: string,
  scenes: { scene: string; detail: string }[],
): Promise<ColoringPageRow[]> {
  const existing = await listPages(bookId);
  const byPosition = new Map(existing.map((row) => [row.position, row]));
  const supabase = admin();

  for (let position = 0; position < scenes.length; position += 1) {
    const { scene, detail } = scenes[position];
    const row = byPosition.get(position);
    if (!row) {
      const { error } = await supabase
        .from("coloring_pages")
        .insert({ book_id: bookId, position, scene, detail, status: "pending" });
      if (error) throw new Error(error.message);
      continue;
    }
    const changed = row.scene !== scene || row.detail !== detail;
    if (!changed) continue;
    const { error } = await supabase
      .from("coloring_pages")
      .update({
        scene,
        detail,
        stale: row.image_path != null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  const extra = existing.filter((row) => row.position >= scenes.length).map((row) => row.id);
  if (extra.length > 0) {
    const { error } = await supabase.from("coloring_pages").delete().in("id", extra);
    if (error) throw new Error(error.message);
  }

  return listPages(bookId);
}

export async function getPage(bookId: string, position: number): Promise<ColoringPageRow | null> {
  const { data, error } = await admin()
    .from("coloring_pages")
    .select("*")
    .eq("book_id", bookId)
    .eq("position", position)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ColoringPageRow | null) ?? null;
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<ColoringPageRow, "status" | "image_path" | "redraws" | "stale">>,
): Promise<void> {
  const { error } = await admin()
    .from("coloring_pages")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Claims a page for drawing: pending, failed or ready (a redraw) becomes
 * "drawing", but only if nobody else did it first. False when the page is
 * already being drawn.
 */
export async function claimPage(id: string, fromStatuses: ColoringPageRow["status"][]): Promise<boolean> {
  const { data, error } = await admin()
    .from("coloring_pages")
    .update({ status: "drawing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", fromStatuses)
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function allPagesReady(bookId: string): Promise<boolean> {
  const pages = await listPages(bookId);
  return pages.length > 0 && pages.every((page) => page.status === "ready");
}

/** Stores one drawn page and returns its path inside the bucket. */
export async function uploadPageArt(userId: string, bookId: string, png: Buffer): Promise<string> {
  const path = `${userId}/${bookId}/pages/${randomUUID()}.png`;
  const { error } = await admin()
    .storage.from(COVER_BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
