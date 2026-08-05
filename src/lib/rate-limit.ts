import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type WindowState = {
  count: number;
  windowStart: number;
};

const memory = new Map<string, WindowState>();
const MEMORY_MAX_KEYS = 5_000;

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number };

function isProductionRuntime() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt) {
    if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_SALT is required in production");
    }
  }
  return createHash("sha256")
    .update(`${salt || "ebookstudio-local"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function hashEmail(email: string): string {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt) {
    if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_SALT is required in production");
    }
  }
  return createHash("sha256")
    .update(`${salt || "ebookstudio-local"}:email:${email.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Fixed-window limiter.
 * Prefers atomic Supabase RPC; fails closed in production if durable store errors.
 */
export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    return checkSupabase(supabase, key, options);
  }

  if (isProductionRuntime()) {
    console.error("rate-limit unavailable: supabase not configured");
    const resetAt = Date.now() + options.windowMs;
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    };
  }

  return checkMemory(key, options);
}

function pruneMemory(now: number, windowMs: number) {
  if (memory.size <= MEMORY_MAX_KEYS) return;
  for (const [k, state] of memory) {
    if (now - state.windowStart >= windowMs) memory.delete(k);
    if (memory.size <= MEMORY_MAX_KEYS * 0.8) break;
  }
  if (memory.size > MEMORY_MAX_KEYS) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
}

function checkMemory(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  pruneMemory(now, options.windowMs);
  const current = memory.get(key);

  if (!current || now - current.windowStart >= options.windowMs) {
    memory.set(key, { count: 1, windowStart: now });
    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  current.count += 1;
  memory.set(key, current);
  const resetAt = current.windowStart + options.windowMs;

  if (current.count > options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: options.limit - current.count,
    resetAt,
  };
}

function failClosed(options: { windowMs: number }, reason: string): RateLimitResult {
  console.error(reason);
  const resetAt = Date.now() + options.windowMs;
  return {
    ok: false,
    remaining: 0,
    resetAt,
    retryAfterSec: Math.max(1, Math.ceil(options.windowMs / 1000)),
  };
}

async function checkSupabase(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));

  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_key: key,
    p_limit: options.limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    if (isProductionRuntime()) {
      return failClosed(
        options,
        `rate-limit rpc failed (fail closed): ${error.message}`,
      );
    }
    console.error("rate-limit rpc failed, memory fallback", error.message);
    return checkMemory(key, options);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== "boolean") {
    if (isProductionRuntime()) {
      return failClosed(options, "rate-limit rpc returned unexpected payload");
    }
    return checkMemory(key, options);
  }

  const resetAt = new Date(row.reset_at).getTime();

  if (!row.allowed) {
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: Number(row.remaining) || 0,
    resetAt,
  };
}
