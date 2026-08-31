"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formats, type EbookFormat } from "@/lib/content";
import { ArrowRight, Loader2 } from "lucide-react";
import { MarkdownBody } from "@/components/app/markdown-body";

type LiveChapter = {
  id: string;
  position: number;
  title: string;
  body: string;
  status: "pending" | "writing" | "ready" | "failed";
};

type Phase =
  | "pick"
  | "creating"
  | "outlining"
  | "writing"
  | "ready"
  | "error";

export function CreateWizard({
  idea,
  preferredFormat = "lead-magnet",
  autoStart = false,
}: {
  idea: string;
  preferredFormat?: string;
  autoStart?: boolean;
}) {
  const [formatSlug, setFormatSlug] = useState(preferredFormat);
  const [phase, setPhase] = useState<Phase>(autoStart ? "creating" : "pick");
  const [error, setError] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [chapters, setChapters] = useState<LiveChapter[]>([]);
  const [activePosition, setActivePosition] = useState(0);
  const autoStarted = useRef(false);

  const selected = useMemo(
    () => formats.find((format) => format.slug === formatSlug) ?? formats[0],
    [formatSlug],
  );

  const createFormats = useMemo(
    () => formats.filter((format) => format.slug !== "coloring-book"),
    [],
  );

  const activeChapter = chapters[activePosition] ?? chapters[0];

  useEffect(() => {
    if (chapters.length === 0) return;
    const writing = chapters.find((chapter) => chapter.status === "writing");
    if (writing) setActivePosition(writing.position);
  }, [chapters]);

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when autoStart
  }, [autoStart]);

  async function startGeneration() {
    setError(null);
    setPhase("creating");
    setTitle(null);
    setSubtitle(null);
    setChapters([]);

    try {
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, formatSlug }),
      });
      const createJson = (await createRes.json()) as {
        ok?: boolean;
        book?: { id: string };
        error?: string;
      };
      if (!createRes.ok || !createJson.book?.id) {
        throw new Error(createJson.error ?? "Could not create book");
      }

      const id = createJson.book.id;
      setBookId(id);
      setPhase("outlining");

      const generateRes = await fetch(`/api/books/${id}/generate`, {
        method: "POST",
      });

      if (!generateRes.ok || !generateRes.body) {
        const fail = (await generateRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(fail?.error ?? "Generation failed to start");
      }

      const reader = generateRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim()) as Record<
            string,
            unknown
          >;

          if (event === "status" && data.status === "outlining") {
            setPhase("outlining");
          }

          if (event === "outline") {
            setPhase("writing");
            setTitle(String(data.title ?? ""));
            setSubtitle(String(data.subtitle ?? ""));
            const outlineChapters = data.chapters as {
              title: string;
              summary: string;
            }[];
            setChapters(
              outlineChapters.map((chapter, index) => ({
                id: `temp-${index}`,
                position: index,
                title: chapter.title,
                body: "",
                status: "pending",
              })),
            );
          }

          if (event === "chapter_start") {
            setPhase("writing");
            const position = Number(data.position);
            setChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? {
                      ...chapter,
                      id: String(data.id),
                      title: String(data.title),
                      status: "writing",
                      body: "",
                    }
                  : chapter,
              ),
            );
          }

          if (event === "chapter_delta") {
            const position = Number(data.position);
            const delta = String(data.delta ?? "");
            setChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? { ...chapter, body: chapter.body + delta, status: "writing" }
                  : chapter,
              ),
            );
          }

          if (event === "chapter_done") {
            const position = Number(data.position);
            setChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? {
                      ...chapter,
                      id: String(data.id),
                      title: String(data.title),
                      body: String(data.body ?? chapter.body),
                      status: "ready",
                    }
                  : chapter,
              ),
            );
          }

          if (event === "done") {
            setPhase("ready");
          }

          if (event === "error") {
            throw new Error(String(data.message ?? "Generation failed"));
          }
        }
      }
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="mt-10 space-y-10">
      {!autoStart ? (
      <section>
        <h2 className="font-display text-xl font-semibold">Choose a format</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {createFormats.map((format) => (
            <FormatCard
              key={format.slug}
              format={format}
              selected={format.slug === formatSlug}
              disabled={phase !== "pick" && phase !== "error" && phase !== "ready"}
              onSelect={() => {
                if (phase === "pick" || phase === "error" || phase === "ready") {
                  setFormatSlug(format.slug);
                  if (phase === "ready" || phase === "error") setPhase("pick");
                }
              }}
            />
          ))}
        </div>

        {(phase === "pick" || phase === "error") && (
          <button
            type="button"
            onClick={startGeneration}
            className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-foreground bg-primary px-6 py-3 text-sm font-extrabold text-on-primary shadow-sm transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Generate {selected.name}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}

        {error ? (
          <p className="mt-4 text-sm font-medium text-red-700" role="alert">
            {error === "openai_not_configured"
              ? "Add OPENAI_API_KEY to .env.local, restart the server, then try again."
              : error}
          </p>
        ) : null}
      </section>
      ) : error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error === "openai_not_configured"
            ? "Add OPENAI_API_KEY to .env.local, restart the server, then try again."
            : error}
        </p>
      ) : null}

      {phase !== "pick" ? (
        <section className="rounded-2xl border-2 border-foreground bg-background p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {statusLabel(phase)}
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold">
                {title ?? "Building your outline…"}
              </h3>
              {subtitle ? (
                <p className="mt-1 text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {phase === "outlining" ||
            phase === "writing" ||
            phase === "creating" ? (
              <Loader2
                className="size-5 animate-spin text-primary"
                aria-hidden="true"
              />
            ) : null}
            {phase === "ready" && bookId ? (
              <Link
                href={`/studio/${bookId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Open in studio
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          {chapters.length > 0 ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
              <ol className="space-y-1">
                {chapters.map((chapter) => (
                  <li key={chapter.position}>
                    <button
                      type="button"
                      onClick={() => setActivePosition(chapter.position)}
                      className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activePosition === chapter.position
                          ? "bg-primary/25 font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="mr-2 text-xs text-muted-foreground">
                        {chapter.position + 1}.
                      </span>
                      {chapter.title || "Untitled"}
                      {chapter.status === "writing" ? " …" : ""}
                    </button>
                  </li>
                ))}
              </ol>

              <article className="min-h-64 rounded-xl border-2 border-border bg-surface-warm p-5 sm:p-6">
                <h4 className="font-display text-lg font-semibold">
                  {activeChapter?.title ?? "Chapter"}
                </h4>
                <div className="mt-4">
                  <MarkdownBody
                    content={
                      activeChapter?.body ||
                      (activeChapter?.status === "writing" ? "_Writing…_" : "")
                    }
                  />
                </div>
              </article>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function FormatCard({
  format,
  selected,
  disabled,
  onSelect,
}: {
  format: EbookFormat;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled && !selected}
      onClick={onSelect}
      className={`rounded-xl border p-5 text-left transition-all ${
        selected
          ? "border-foreground bg-primary/15 shadow-sm"
          : "border-border bg-background hover:border-primary/50"
      } ${disabled && !selected ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <p className="font-display text-sm font-semibold">{format.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {format.pages} pages · {format.chapters} chapters · {format.credits}{" "}
        credits
      </p>
      {format.slug === "lead-magnet" ? (
        <p className="mt-2 text-xs font-semibold text-primary-strong">
          Recommended to start
        </p>
      ) : null}
    </button>
  );
}

function statusLabel(phase: Phase) {
  switch (phase) {
    case "creating":
      return "Creating draft";
    case "outlining":
      return "Writing outline";
    case "writing":
      return "Writing chapters";
    case "ready":
      return "Ready to preview";
    case "error":
      return "Something went wrong";
    default:
      return "Studio";
  }
}
