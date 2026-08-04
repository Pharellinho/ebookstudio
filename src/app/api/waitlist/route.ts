import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/client-ip";
import { sendWaitlistConfirmation } from "@/lib/email";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { joinWaitlist } from "@/lib/waitlist";

/** Max waitlist POSTs per IP per 15 minutes. */
const WAITLIST_LIMIT = 8;
const WAITLIST_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const rate = await checkRateLimit(`waitlist:${ipHash}`, {
    limit: WAITLIST_LIMIT,
    windowMs: WAITLIST_WINDOW_MS,
  });

  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate-limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec),
          "X-RateLimit-Limit": String(WAITLIST_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
        },
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const body = payload as {
    email?: unknown;
    consent?: unknown;
    referredBy?: unknown;
    source?: unknown;
  };

  const email = typeof body.email === "string" ? body.email : "";

  const result = await joinWaitlist({
    email,
    consent: body.consent === true,
    referredBy: typeof body.referredBy === "string" ? body.referredBy : null,
    source: typeof body.source === "string" ? body.source : null,
    ipHash,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Await so the send finishes before the route ends; never fail signup on email.
  await sendWaitlistConfirmation({
    email: email.trim().toLowerCase(),
    code: result.code,
    position: result.position,
    alreadyOnList: result.alreadyOnList,
  });

  return NextResponse.json(
    {
      code: result.code,
      position: result.position,
      alreadyOnList: result.alreadyOnList,
    },
    {
      headers: {
        "X-RateLimit-Limit": String(WAITLIST_LIMIT),
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
      },
    },
  );
}
