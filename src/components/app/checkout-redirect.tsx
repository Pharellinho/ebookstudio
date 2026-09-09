"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { PaidPlanId } from "@/lib/billing/plans";

const MESSAGES: Record<string, string> = {
  billing_not_configured: "Payments are not switched on yet. Please try again later.",
  rate_limited: "Too many attempts in a row. Give it a minute and try again.",
};

/**
 * Asks the server for a Checkout link and sends the browser there. Runs
 * only once the page is on screen, so a prefetch never opens a session.
 */
export function CheckoutRedirect({ plan }: { plan: PaidPlanId }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  /* One request per visit, whatever React does with the effect (dev mode
     mounts twice): the ref, not a cleanup flag, is what stops a second
     session from being opened. */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!res.ok || !json?.url) throw new Error(json?.error ?? "checkout_failed");
        window.location.assign(json.url);
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        setError(MESSAGES[code] ?? "The checkout could not be opened. Try again in a moment.");
      }
    })();
  }, [plan]);

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 text-center">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Link href="/pricing" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
          Back to pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-background p-8 text-center">
      <Loader2 className="size-5 animate-spin text-primary-strong" aria-hidden="true" />
      <p className="text-sm font-semibold">Taking you to secure checkout…</p>
      <p className="text-xs text-muted-foreground">Payments are handled by Stripe. We never see your card.</p>
    </div>
  );
}
