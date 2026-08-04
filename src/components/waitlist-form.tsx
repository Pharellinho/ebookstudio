"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader } from "lucide-react";

const messages: Record<string, string> = {
  "invalid-email": "That email address does not look right.",
  "consent-required": "Please tick the box so we can email you at launch.",
  storage: "Something broke on our side. Try again in a moment.",
};

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const referredBy = useRef<string | null>(null);
  const source = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    referredBy.current = params.get("ref");
    source.current = params.get("utm_source") ?? (document.referrer || null);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          referredBy: referredBy.current,
          source: source.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(messages[data.error] ?? messages.storage);
        setPending(false);
        return;
      }

      router.push(`/welcome?code=${data.code}`);
    } catch {
      setError(messages.storage);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-foreground bg-background p-2 shadow-md transition-shadow duration-200 focus-within:shadow-lg sm:flex-row sm:items-center">
        <label htmlFor="waitlist-email" className="sr-only">
          Your email address
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full flex-1 rounded-xl bg-transparent px-4 py-3 text-base placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-6 py-3 font-extrabold text-on-primary shadow-md transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {pending ? (
            <Loader className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {compact ? "Join" : "Claim my founding spot"}
          {pending ? null : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-left">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          Email me when EbookStudio launches and about my founding spot. No
          other mail, and you can unsubscribe in one click.
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
