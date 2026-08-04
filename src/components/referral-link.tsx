"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export function ReferralLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // The async clipboard API is unavailable outside secure contexts and in
      // some in-app browsers, which is exactly where invite links get opened.
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }

    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        aria-label="Your invite link"
        onFocus={(event) => event.currentTarget.select()}
        className="w-full flex-1 truncate rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
