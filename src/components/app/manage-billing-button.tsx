"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

const MESSAGES: Record<string, string> = {
  billing_not_configured: "Payments are not switched on yet.",
  no_customer: "There is no subscription on this account yet.",
  rate_limited: "Too many attempts in a row. Give it a minute.",
};

/** Opens Stripe's billing portal: invoices, card, plan change, cancellation. */
export function ManageBillingButton({ label = "Manage billing" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !json?.url) throw new Error(json?.error ?? "portal_failed");
      window.location.assign(json.url);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(MESSAGES[code] ?? "The billing page could not be opened. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-foreground bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-surface-warm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="size-4" aria-hidden="true" />}
        {label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
