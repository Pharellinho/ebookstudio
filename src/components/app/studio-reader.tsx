"use client";

import { useState } from "react";
import Link from "next/link";
import { MarkdownBody } from "@/components/app/markdown-body";

type Chapter = {
  id: string;
  position: number;
  title: string;
  body: string;
};

export function StudioReader({
  bookId,
  title,
  subtitle,
  idea,
  status,
  chapters,
}: {
  bookId: string;
  title: string;
  subtitle: string | null;
  idea: string;
  status: string;
  chapters: Chapter[];
}) {
  const [active, setActive] = useState(0);
  const chapter = chapters[active] ?? chapters[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {status === "ready" ? "Preview" : status}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">Idea: {idea}</p>
        </div>
        <Link
          href="/books"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← My eBooks
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border-2 border-border bg-background p-3 lg:sticky lg:top-6">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Chapters
          </p>
          <ol className="mt-1 space-y-0.5">
            {chapters.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.position)}
                  className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active === item.position
                      ? "bg-primary/25 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="mr-2 text-xs opacity-60">
                    {item.position + 1}.
                  </span>
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <article className="min-h-[70vh] rounded-2xl border-2 border-foreground bg-background p-6 shadow-sm sm:p-8 lg:p-10">
          <h2 className="font-display text-2xl font-bold">
            {chapter?.position != null ? `${chapter.position + 1}. ` : ""}
            {chapter?.title ?? "Chapter"}
          </h2>
          <div className="mt-6">
            <MarkdownBody content={chapter?.body ?? ""} />
          </div>
        </article>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6">
        <p className="font-display text-base font-semibold text-primary-strong">
          Preview is free — download comes with Pro
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF / EPUB export and cover polish come next.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
          <Link
            href={`/create?idea=${encodeURIComponent(idea)}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Generate another
          </Link>
          <Link
            href={`/studio/${bookId}`}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Refresh
          </Link>
        </div>
      </div>
    </div>
  );
}
