import { NextResponse } from "next/server";
import { sendWaitlistConfirmation } from "@/lib/email";
import { joinWaitlist } from "@/lib/waitlist";

export async function POST(request: Request) {
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

  return NextResponse.json({
    code: result.code,
    position: result.position,
    alreadyOnList: result.alreadyOnList,
  });
}
