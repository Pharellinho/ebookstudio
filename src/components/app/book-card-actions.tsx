"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

/* Plain words for every way a delete can fail. */
function friendlyError(status: number | null): string {
  if (status === 409) return "Stop the generation first.";
  if (status === 404) return "This book no longer exists.";
  if (status === null) return "Could not reach the server. Check your connection.";
  return "Could not delete this book. Try again in a moment.";
}

type Props = {
  bookId: string;
  title: string;
  /** Card mode: the card content. Wrapped in a frame that carries the button,
   *  the two-step confirmation and, once deleted, a short notice in its place. */
  children?: ReactNode;
  /** Standalone mode (studio): where to go once the book is gone. */
  redirectTo?: string;
  className?: string;
};

/**
 * Delete a book with a two-step confirmation: the first click asks, the
 * second deletes. No window.confirm. The server does the real ownership
 * check; this only shows the answer in readable words.
 */
export function BookCardActions({
  bookId,
  title,
  children,
  redirectTo,
  className,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    let status: number | null = null;
    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      status = res.status;
    } catch {
      status = null;
    }
    setBusy(false);

    if (status !== 200) {
      setError(friendlyError(status));
      return;
    }
    setConfirming(false);
    setDeleted(true);
    if (redirectTo) router.push(redirectTo);
  }

  /* ---- Standalone (studio header) ---- */
  if (!children) {
    if (deleted) {
      return (
        <p role="status" className={cn("text-sm text-muted-foreground", className)}>
          “{title}” deleted.
        </p>
      );
    }
    return (
      <div className={cn("flex flex-wrap items-center gap-3 text-sm", className)}>
        {confirming ? (
          <>
            <span className="font-medium">Delete this book? This can&apos;t be undone.</span>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-destructive px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              Delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            {error ? (
              <span role="alert" className="basis-full text-xs text-destructive">
                {error}
              </span>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete book
          </button>
        )}
      </div>
    );
  }

  /* ---- Card frame ---- */
  if (deleted) {
    return (
      <div
        role="status"
        className={cn(
          "flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-5 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        “{title}” deleted.
      </div>
    );
  }

  return (
    <div className={cn("group relative h-full", className)}>
      {children}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete “${title}”`}
          className="absolute bottom-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-opacity hover:border-destructive/40 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label={`Delete “${title}”`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/95 p-5 text-center"
        >
          <p className="text-sm font-semibold">
            Delete this book? This can&apos;t be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              Delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
