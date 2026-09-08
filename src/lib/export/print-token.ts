import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * The print page is what the headless browser photographs to make the PDF.
 * It runs in a separate request, outside the user's session, so it is
 * opened with a short-lived token that names one book for one user and
 * nothing else. Anyone without the token gets "not found".
 */

const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  if (!key) throw new Error("CLERK_SECRET_KEY is required to sign print tokens");
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** `bookId.userId.expiresAt.signature`, URL-safe. */
export function issuePrintToken(bookId: string, userId: string, now = Date.now()): string {
  const expires = now + TTL_MS;
  const payload = `${bookId}.${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

/** The book and user a token names, or null when it is forged, stale or malformed. */
export function readPrintToken(token: string, now = Date.now()): { bookId: string; userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [bookId, userId, expiresRaw, signature] = parts;
  const expires = Number(expiresRaw);
  if (!bookId || !userId || !Number.isFinite(expires) || expires < now) return null;
  const expected = sign(`${bookId}.${userId}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { bookId, userId };
}
