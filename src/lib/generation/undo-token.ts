import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Undo without trusting the client.
 *
 * The client never sends chapter text. To restore a paragraph it sends back a
 * token the server issued at rewrite time: the previous paragraph plus what
 * replaced it, signed with a server secret and bound to the user, the chapter
 * and the paragraph. The route then checks that the chapter still holds the
 * replacement before writing the old text back, so a stale token cannot
 * clobber a later edit.
 *
 * The secret follows the rate limiter: RATE_LIMIT_SALT, required in
 * production, with a fixed fallback for local development only.
 */

export type UndoPayload = {
  userId: string;
  chapterId: string;
  paragraphIndex: number;
  replacedCount: number;
  /** SHA-256 of the replacement text, so the token stays small. */
  replacementHash: string;
  previous: string;
  expiresAt: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt) {
    if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_SALT is required in production");
    }
    return "ebookstudio-local";
  }
  return salt;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function hashText(text: string): string {
  return createHmac("sha256", "ebookstudio-text").update(text).digest("hex");
}

export function issueUndoToken(
  payload: Omit<UndoPayload, "expiresAt">,
): string {
  const encoded = Buffer.from(
    JSON.stringify({ ...payload, expiresAt: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readUndoToken(token: string): UndoPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(encoded), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as UndoPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.chapterId !== "string" ||
      !Number.isInteger(payload.paragraphIndex) ||
      !Number.isInteger(payload.replacedCount) ||
      typeof payload.replacementHash !== "string" ||
      typeof payload.previous !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
