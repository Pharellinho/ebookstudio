import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Private bucket. Objects are reached only through short-lived signed URLs. */
export const COVER_BUCKET = "covers";
const SIGNED_URL_SECONDS = 10 * 60;

function admin() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/** Creates the bucket if migration 0010 has not been applied yet. Idempotent. */
async function ensureBucket() {
  const supabase = admin();
  const { data } = await supabase.storage.getBucket(COVER_BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(COVER_BUCKET, { public: false });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

/** Stores one generated illustration and returns its path inside the bucket. */
export async function uploadCoverArt(
  userId: string,
  bookId: string,
  png: Buffer,
): Promise<string> {
  await ensureBucket();
  const path = `${userId}/${bookId}/${randomUUID()}.png`;
  const { error } = await admin()
    .storage.from(COVER_BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** A URL the browser can load for a few minutes, or null when there is no art. */
export async function signCoverArt(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin()
    .storage.from(COVER_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** The raw bytes, for server-side rasterisation. */
export async function downloadCoverArt(path: string): Promise<Buffer | null> {
  const { data, error } = await admin().storage.from(COVER_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
