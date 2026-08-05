import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/client-ip";
import { sendWaitlistConfirmation } from "@/lib/email";
import { checkRateLimit, hashEmail, hashIp } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { joinWaitlist } from "@/lib/waitlist";

/** Max waitlist POSTs per IP per 15 minutes. */
const WAITLIST_LIMIT = 8;
const WAITLIST_WINDOW_MS = 15 * 60 * 1000;
/** Max confirmation emails per address per hour (re-signup / resend). */
const EMAIL_RESEND_LIMIT = 2;
const EMAIL_RESEND_WINDOW_MS = 60 * 60 * 1000;

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin navigations / some clients omit Origin on POST.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }

  const allowed = new Set(
    [
      site.url,
      `https://${site.domain}`,
      `https://www.${site.domain}`,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].map((value) => value.replace(/\/$/, "")),
  );

  try {
    const normalised = new URL(origin).origin;
    return allowed.has(normalised);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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
    const status = result.error === "unavailable" ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const normalisedEmail = email.trim().toLowerCase();

  if (result.alreadyOnList) {
    const emailRate = await checkRateLimit(
      `waitlist-resend:${hashEmail(normalisedEmail)}`,
      {
        limit: EMAIL_RESEND_LIMIT,
        windowMs: EMAIL_RESEND_WINDOW_MS,
      },
    );

    if (emailRate.ok) {
      await sendWaitlistConfirmation({
        email: normalisedEmail,
        code: result.resend.code,
        confirmToken: result.resend.confirmToken,
        position: result.resend.position,
        alreadyOnList: true,
      });
    }

    // Never return invite code for existing emails (closes IDOR).
    return NextResponse.json(
      { alreadyOnList: true },
      {
        headers: {
          "X-RateLimit-Limit": String(WAITLIST_LIMIT),
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
        },
      },
    );
  }

  await sendWaitlistConfirmation({
    email: normalisedEmail,
    code: result.code,
    confirmToken: result.confirmToken,
    position: result.position,
    alreadyOnList: false,
  });

  return NextResponse.json(
    {
      code: result.code,
      position: result.position,
      alreadyOnList: false,
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
