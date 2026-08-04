import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type WindowState = {
  count: number;
  windowStart: number;
};

const memory = new Map<string, WindowState>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number };

export function hashIp(ip: string): string {
  const salt =
    process.env.RATE_LIMIT_SALT?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 24) ||
    "ebookstudio-local";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Sliding fixed-window limiter.
 * Uses Supabase when configured (works across Vercel instances),
 * otherwise falls back to in-memory (fine for local / single instance).
 */
export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    return checkSupabase(supabase, key, options);
  }
  return checkMemory(key, options);
}

function checkMemory(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
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

async function checkSupabase(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const now = Date.now();

  const { data: row, error } = await supabase
    .from("api_rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    // Table missing or RLS — fail open with memory so signups still work.
    console.error("rate-limit supabase read failed", error.message);
    return checkMemory(key, options);
  }

  const windowStart = row ? new Date(row.window_start).getTime() : 0;
  const inWindow = Boolean(row && now - windowStart < options.windowMs);

  if (!inWindow) {
    const { error: upsertError } = await supabase.from("api_rate_limits").upsert(
      {
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
      },
      { onConflict: "key" },
    );

    if (upsertError) {
      console.error("rate-limit supabase upsert failed", upsertError.message);
      return checkMemory(key, options);
    }

    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  const nextCount = (row!.count as number) + 1;
  const { error: updateError } = await supabase
    .from("api_rate_limits")
    .update({ count: nextCount })
    .eq("key", key)
    .eq("window_start", row!.window_start);

  if (updateError) {
    console.error("rate-limit supabase update failed", updateError.message);
    return checkMemory(key, options);
  }

  const resetAt = windowStart + options.windowMs;

  if (nextCount > options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: options.limit - nextCount,
    resetAt,
  };
}
