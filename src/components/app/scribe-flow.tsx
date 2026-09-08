"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookImage,
  Check,
  Loader2,
  Pencil,
  Sparkles,
  Square,
} from "lucide-react";
import { formats } from "@/lib/content";
import { takeHandoffIdea } from "@/lib/idea-handoff";
import { FormatCard } from "@/components/app/format-card";
import { MarkdownBody } from "@/components/app/markdown-body";

type Step = "idea" | "format" | "titles" | "outline" | "writing" | "done";

type TitleOption = { title: string; blurb: string };
type OutlineChapter = { title: string; summary: string };

type LiveChapter = {
  position: number;
  title: string;
  body: string;
  status: "pending" | "writing" | "ready";
};

/* The welcome cover has its own little life, separate from the chapters:
   it starts with them, and whether it arrives or fails changes nothing
   about the writing. */
type CoverStatus = "idle" | "drawing" | "ready" | "failed";

/* Once the last chapter is in, wait this long at most for a cover still
   being drawn before opening the studio anyway. */
const COVER_GRACE_MS = 90_000;

const EXAMPLES = [
  "A step-by-step guide to growing your first vegetable garden",
  "10 ways to grow Instagram followers organically without paid ads",
  "A calm evening routine for exhausted parents",
];

/* Server routes answer with short codes. Readers get sentences instead. */
const ERROR_TEXT: Record<string, string> = {
  openai_not_configured:
    "Scribe's writing model isn't connected on this server yet. This is a setup issue on our side, not something you did.",
  rate_limited: "You've hit the hourly limit. Give it an hour and try again.",
  already_generating: "This book is still being written. Wait for it to finish, or stop it first.",
  not_found: "This book could not be found. It may have been deleted.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  forbidden: "This request was blocked. Reload the page and try again.",
  invalid_json: "Something went wrong sending your idea. Try again.",
  invalid_idea: "Tell Scribe a bit more — at least a sentence, and no more than 1200 characters.",
  invalid_format: "That format is not available. Pick another one.",
  invalid_outline: "The outline could not be read. Go back a step and try again.",
};

function friendlyError(raw: unknown): string {
  const code = raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "";
  if (ERROR_TEXT[code]) return ERROR_TEXT[code];
  // A code we do not know (snake_case, no spaces) must not reach the screen raw.
  if (/^[a-z0-9_]+$/.test(code)) return "Something went wrong on our side. Try again in a moment.";
  return code || "Something went wrong. Try again in a moment.";
}

export function ScribeFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idea");
  const [idea, setIdea] = useState("");
  const [statusLine, setStatusLine] = useState("Scribe is listening.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formatSlug, setFormatSlug] = useState("lead-magnet");
  const [formatName, setFormatName] = useState("Lead Magnet");
  const [formatReason, setFormatReason] = useState("");
  // Kept in step with the API reply but never shown: there is no balance,
  // no deduction and no billing yet, so a cost on screen would be a promise.
  const [, setCredits] = useState(25);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [chapterRange, setChapterRange] = useState("5–7");

  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomTitle, setShowCustomTitle] = useState(false);

  const [outlineChapters, setOutlineChapters] = useState<OutlineChapter[]>([]);
  const [subtitle, setSubtitle] = useState("");

  const [bookId, setBookId] = useState<string | null>(null);
  const generation = useRef<AbortController | null>(null);
  /* Set by the Stop button before aborting, so the abort is reported as a
     stop the user asked for rather than swallowed as an unmount. */
  const stopRequested = useRef(false);
  const [stopped, setStopped] = useState(false);
  const [liveChapters, setLiveChapters] = useState<LiveChapter[]>([]);
  const [activePosition, setActivePosition] = useState(0);
  const [writingLabel, setWritingLabel] = useState("");

  const coverRequest = useRef<AbortController | null>(null);
  const [coverStatus, setCoverStatus] = useState<CoverStatus>("idle");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const ebookFormats = useMemo(
    () => formats.filter((f) => f.slug !== "coloring-book"),
    [],
  );

  /* Closing the tab or navigating away used to leave the server writing into a
     connection nobody was reading, and the book sat in "writing" for good.
     Aborting ends the request so the book can be picked up again. */
  useEffect(
    () => () => {
      generation.current?.abort();
      coverRequest.current?.abort();
    },
    [],
  );

  /* The book is written. Open the studio as soon as the cover is settled —
     arrived or given up — so the reader lands on both at once. A cover that
     drags on does not hold the book hostage: the grace period ends the wait. */
  useEffect(() => {
    if (step !== "done" || !bookId) return;
    if (coverStatus !== "drawing") {
      router.push(`/studio/${bookId}`);
      return;
    }
    const timer = window.setTimeout(() => router.push(`/studio/${bookId}`), COVER_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [step, coverStatus, bookId, router]);

  /* An idea typed on the landing page waits in sessionStorage while the
     visitor signs up. Take it once, then it is gone — it never travels in a
     URL. It is plain text for the textarea, nothing else. */
  useEffect(() => {
    const pending = takeHandoffIdea();
    if (pending) setIdea(pending);
  }, []);

  const activeChapter = liveChapters[activePosition] ?? liveChapters[0];
  const finalTitle = showCustomTitle ? customTitle.trim() : selectedTitle;

  async function continueFromIdea() {
    const trimmed = idea.trim();
    if (trimmed.length < 8) {
      setError("Tell Scribe a bit more — at least a sentence.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatusLine("Scribe is confirming the format.");
    try {
      const res = await fetch("/api/books/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "format", idea: trimmed }),
      });
      const json = (await res.json()) as {
        formatSlug?: string;
        formatName?: string;
        reason?: string;
        credits?: number;
        chapters?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not detect format");
      setFormatSlug(json.formatSlug ?? "lead-magnet");
      setFormatName(json.formatName ?? "Lead Magnet");
      setFormatReason(json.reason ?? "");
      setCredits(json.credits ?? 25);
      setChapterRange(json.chapters ?? "5–7");
      setStep("format");
    } catch (err) {
      setError(friendlyError(err));
      setStatusLine("Scribe is listening.");
    } finally {
      setBusy(false);
    }
  }

  async function planBook() {
    setBusy(true);
    setError(null);
    setStatusLine("Scribe is confirming your title and outline.");
    try {
      const res = await fetch("/api/books/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "titles",
          idea: idea.trim(),
          formatSlug,
        }),
      });
      const json = (await res.json()) as {
        titles?: TitleOption[];
        error?: string;
      };
      if (!res.ok || !json.titles?.length) {
        throw new Error(json.error ?? "Could not suggest titles");
      }
      setTitles(json.titles);
      setSelectedTitle(json.titles[0].title);
      setStep("titles");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadMoreTitles() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/books/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "titles",
          idea: idea.trim(),
          formatSlug,
        }),
      });
      const json = (await res.json()) as {
        titles?: TitleOption[];
        error?: string;
      };
      if (!res.ok || !json.titles?.length) {
        throw new Error(json.error ?? "Could not suggest titles");
      }
      setTitles(json.titles);
      setSelectedTitle(json.titles[0].title);
      setShowCustomTitle(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTitleAndOutline() {
    if (!finalTitle) {
      setError("Pick a title or write your own.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatusLine("Scribe is confirming your title and outline.");
    try {
      const res = await fetch("/api/books/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outline",
          idea: idea.trim(),
          formatSlug,
          title: finalTitle,
        }),
      });
      const json = (await res.json()) as {
        outline?: {
          title: string;
          subtitle: string;
          chapters: OutlineChapter[];
        };
        error?: string;
      };
      if (!res.ok || !json.outline) {
        throw new Error(json.error ?? "Could not plan outline");
      }
      setSubtitle(json.outline.subtitle);
      setOutlineChapters(json.outline.chapters);
      setSelectedTitle(json.outline.title);
      setStep("outline");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function freshController() {
    generation.current?.abort();
    const controller = new AbortController();
    generation.current = controller;
    stopRequested.current = false;
    return controller;
  }

  /* Streams one generation run for an existing book. A resume calls this
     again on the same id: the server replays the chapters already written
     and only pays for the rest. */
  async function streamGeneration(id: string, controller: AbortController) {
    setBusy(true);
    setError(null);
    setStopped(false);
    setStatusLine("Scribe is writing your book…");
    setStep("writing");

    try {
      const generateRes = await fetch(`/api/books/${id}/generate`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!generateRes.ok || !generateRes.body) {
        const fail = (await generateRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(fail?.error ?? "Generation failed");
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

          if (event === "chapter_start") {
            const position = Number(data.position);
            setActivePosition(position);
            setWritingLabel(`Writing chapter ${position + 1}`);
            setLiveChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? {
                      ...chapter,
                      title: String(data.title ?? chapter.title),
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
            setActivePosition(position);
            setLiveChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? {
                      ...chapter,
                      body: chapter.body + delta,
                      status: "writing",
                    }
                  : chapter,
              ),
            );
          }

          if (event === "chapter_done") {
            const position = Number(data.position);
            setLiveChapters((prev) =>
              prev.map((chapter) =>
                chapter.position === position
                  ? {
                      ...chapter,
                      title: String(data.title ?? chapter.title),
                      body: String(data.body ?? chapter.body),
                      status: "ready",
                    }
                  : chapter,
              ),
            );
          }

          if (event === "done") {
            setStep("done");
            setStatusLine("Scribe finished your book.");
            setBusy(false);
            setWritingLabel("");
          }

          /* The server writes a few chapters per call; it asks us to call
             again for the next slice. Same book, same controller, no pause
             visible to the reader. */
          if (event === "paused") {
            setStatusLine(
              `Scribe is writing your book… (${Number(data.nextPosition) + 1} of ${Number(data.total)})`,
            );
            void streamGeneration(id, controller);
            return;
          }

          if (event === "error") {
            throw new Error(String(data.message ?? "Generation failed"));
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Unmount: the reader has already left, so say nothing.
        if (!stopRequested.current) return;
        // The Stop button: keep the page, tell the user what is saved.
        setBusy(false);
        setStopped(true);
        setWritingLabel("");
        setLiveChapters((prev) =>
          prev.map((chapter) =>
            chapter.status === "writing" ? { ...chapter, status: "pending", body: "" } : chapter,
          ),
        );
        setStatusLine("Generation stopped.");
        return;
      }
      setBusy(false);
      setError(friendlyError(err));
      setStep("outline");
      setStatusLine("Scribe is ready when you are.");
    }
  }

  function stopGeneration() {
    stopRequested.current = true;
    generation.current?.abort();
  }

  /* The welcome cover: one cover drawn from the outline alone, in a request
     of its own, while the chapters are being written. Its failure is its
     own: it never touches the writing, its error never reaches `error`. */
  async function startWelcomeCover(id: string) {
    if (coverStatus === "drawing" || coverStatus === "ready") return;
    coverRequest.current?.abort();
    const controller = new AbortController();
    coverRequest.current = controller;
    setCoverStatus("drawing");
    try {
      const res = await fetch(`/api/books/${id}/cover/welcome`, {
        method: "POST",
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as {
        candidate?: { url?: string | null };
        error?: string;
      } | null;
      if (!res.ok || !json?.candidate?.url) throw new Error(json?.error ?? "cover_failed");
      setCoverUrl(json.candidate.url);
      setCoverStatus("ready");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCoverStatus("failed");
    }
  }

  async function resumeGeneration() {
    if (!bookId) return;
    await streamGeneration(bookId, freshController());
  }

  async function buildBook() {
    // A book that was stopped picks up where it left off; no second copy.
    if (bookId) {
      if (coverStatus !== "ready") void startWelcomeCover(bookId);
      await streamGeneration(bookId, freshController());
      return;
    }

    setBusy(true);
    setError(null);
    setStatusLine("Scribe is writing your book…");
    setStep("writing");
    setLiveChapters(
      outlineChapters.map((chapter, index) => ({
        position: index,
        title: chapter.title,
        body: "",
        status: "pending",
      })),
    );

    const controller = freshController();

    let id: string;
    try {
      const createRes = await fetch("/api/books", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          formatSlug,
          title: finalTitle,
          subtitle,
          outline: {
            title: finalTitle,
            subtitle,
            chapters: outlineChapters,
          },
        }),
      });
      const createJson = (await createRes.json()) as {
        book?: { id: string };
        error?: string;
      };
      if (!createRes.ok || !createJson.book?.id) {
        throw new Error(createJson.error ?? "Could not create book");
      }
      id = createJson.book.id;
      setBookId(id);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBusy(false);
      setError(friendlyError(err));
      setStep("outline");
      setStatusLine("Scribe is ready when you are.");
      return;
    }

    // Two independent requests from here: the cover and the chapters.
    void startWelcomeCover(id);
    await streamGeneration(id, controller);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-background shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <p className="font-display text-sm">
            <span className="font-bold">Scribe</span>{" "}
            <span className="font-medium text-muted-foreground">
              your AI book agent
            </span>
          </p>
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            {statusLine}
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {step === "idea" ? (
            <>
              <div>
                <p className="font-display text-lg font-bold">
                  Hi, I&apos;m Scribe. Let&apos;s make your book.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tell me what it&apos;s about in a sentence or two. I&apos;ll
                  pick the best format, plan the chapters, write the whole
                  thing, and hand you a finished book to download — usually in
                  a few minutes.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-primary/40 bg-[#f7f5f1]/40 p-3">
                <textarea
                  rows={4}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder='e.g. "A step-by-step guide to growing your first vegetable garden"'
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
                />
                <p className="px-2 pt-1 text-right text-[11px] text-muted-foreground">
                  {idea.trim().length} characters
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setIdea(example)}
                    className="cursor-pointer rounded-full bg-muted px-3 py-1.5 hover:text-foreground"
                  >
                    {example.slice(0, 42)}…
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={continueFromIdea}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}

          {step !== "idea" ? (
            <div className="flex items-start justify-end gap-3">
              {/* The idea is rendered as text, nothing more: React escapes it
                  and it never reaches an instruction of any kind here. */}
              <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-muted px-4 py-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Your idea
                </p>
                <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {idea}
                </p>
                {step === "format" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFormatPicker(false);
                      setStep("idea");
                      setStatusLine("Scribe is listening.");
                    }}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit idea
                  </button>
                ) : null}
              </div>
              <span className="mt-1 shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                You
              </span>
            </div>
          ) : null}

          {step === "format" ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Scribe
              </p>
              <div className="mt-2 rounded-2xl rounded-tl-md border border-border/80 bg-background p-4 sm:p-5">
                <p className="font-display text-base font-bold">
                  Got it — this looks like a {formatName}.
                </p>
                {formatReason ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {formatReason}
                  </p>
                ) : null}

                <div className="mt-4 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Format:</span>{" "}
                      <span className="font-semibold">{formatName}</span>{" "}
                      <span className="text-muted-foreground">
                        · {chapterRange} chapters
                      </span>
                    </p>
                    <button
                      type="button"
                      aria-expanded={showFormatPicker}
                      onClick={() => setShowFormatPicker((open) => !open)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Not this? Change it
                    </button>
                  </div>

                  {showFormatPicker ? (
                    <div
                      role="radiogroup"
                      aria-label="Pick the format"
                      className="mt-3 grid gap-2 sm:grid-cols-2"
                    >
                      {ebookFormats.map((format) => (
                        <FormatCard
                          key={format.slug}
                          format={format}
                          selected={format.slug === formatSlug}
                          disabled={busy}
                          onSelect={() => {
                            setFormatSlug(format.slug);
                            setFormatName(format.name);
                            setCredits(format.credits);
                            setChapterRange(format.chapters);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-2 text-xs text-muted-foreground">
                    Language: English (default)
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={planBook}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Looks good — plan my book
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {(step === "titles" ||
            step === "outline" ||
            step === "writing" ||
            step === "done") && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-muted px-3 py-1">{formatName}</span>
              <span className="rounded-full bg-muted px-3 py-1">English</span>
            </div>
          )}

          {step === "titles" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Waiting for you to pick a title.
              </p>
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Pick the title you&apos;ll publish under
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCustomTitle((v) => !v)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary-strong"
                  >
                    <Pencil className="size-3.5" />
                    Write your own
                  </button>
                </div>

                {showCustomTitle ? (
                  <input
                    value={customTitle}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    placeholder="Your title"
                    className="mb-3 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                ) : (
                  <div className="space-y-2">
                    {titles.map((option) => (
                      <button
                        key={option.title}
                        type="button"
                        onClick={() => setSelectedTitle(option.title)}
                        className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors ${
                          selectedTitle === option.title
                            ? "border-foreground bg-primary/15"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className="font-display text-sm font-bold">
                          {option.title}
                        </p>
                        {option.blurb ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {option.blurb}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={loadMoreTitles}
                  className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Show me 3 more
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmTitleAndOutline}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue with this title
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}

          {step === "outline" ? (
            <>
              <div className="rounded-2xl border border-border/80 p-4">
                <ChecklistRow done label="Read your idea">
                  <span className="italic text-muted-foreground">{idea}</span>
                </ChecklistRow>
                <ChecklistRow done label="Title">
                  <span className="font-semibold">{finalTitle}</span>
                </ChecklistRow>
                <ChecklistRow done label={`Outlined ${outlineChapters.length} chapters`}>
                  <ol className="mt-2 space-y-2">
                    {outlineChapters.map((chapter, index) => (
                      <li key={`${chapter.title}-${index}`} className="text-sm">
                        <span className="font-semibold">
                          {index + 1}. {chapter.title}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {chapter.summary}
                        </p>
                      </li>
                    ))}
                  </ol>
                </ChecklistRow>
              </div>

              <p className="text-xs text-muted-foreground">
                Scribe writes all {outlineChapters.length} chapters in a few
                minutes. You can leave anytime; it keeps writing.
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={buildBook}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary disabled:opacity-60"
                >
                  Build my book
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </>
          ) : null}

          {step === "writing" || step === "done" ? (
            <>
              <p className="text-sm">
                Building <span className="font-semibold">{finalTitle}</span> —{" "}
                {outlineChapters.length} chapters. Watch it come together below.
              </p>

              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="space-y-3">
                <CoverSlot status={coverStatus} url={coverUrl} title={finalTitle} />
                <ol className="space-y-2 rounded-2xl border border-border/80 p-3 text-sm">
                  <li className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Check className="size-3.5" /> Read your idea
                  </li>
                  <li className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Check className="size-3.5" /> Outlined{" "}
                    {outlineChapters.length} chapters
                  </li>
                  {liveChapters.map((chapter) => (
                    <li key={chapter.position}>
                      <button
                        type="button"
                        onClick={() => setActivePosition(chapter.position)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                          activePosition === chapter.position
                            ? "bg-primary/15 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {chapter.status === "ready" ? (
                          <Check className="mt-0.5 size-3.5 text-emerald-700" />
                        ) : chapter.status === "writing" ? (
                          <Loader2 className="mt-0.5 size-3.5 animate-spin text-primary" />
                        ) : (
                          <span className="mt-0.5 size-3.5 rounded-full border border-border" />
                        )}
                        <span>
                          {chapter.status === "writing"
                            ? `Writing chapter ${chapter.position + 1}`
                            : chapter.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                </div>

                <article className="min-h-72 rounded-2xl border border-foreground/80 bg-[#fffdf8] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">
                    Chapter {(activeChapter?.position ?? 0) + 1}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold">
                    {activeChapter?.title}
                  </h3>
                  <div className="mt-4">
                    <MarkdownBody
                      content={
                        activeChapter?.body ||
                        (activeChapter?.status === "writing"
                          ? "_Scribe is writing this page…_"
                          : "")
                      }
                    />
                  </div>
                </article>
              </div>

              {step === "done" ? (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    {coverStatus === "drawing" ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        Your book is written. Finishing the cover…
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
                        Your book is ready. Opening the studio…
                      </>
                    )}
                  </span>
                  {bookId ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/studio/${bookId}`)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-on-primary hover:bg-primary-strong"
                    >
                      Open the studio
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ) : stopped ? (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm"
                >
                  <span className="font-medium">
                    Generation stopped — your finished chapters are saved.
                  </span>
                  <button
                    type="button"
                    onClick={resumeGeneration}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-on-primary hover:bg-primary-strong"
                  >
                    Resume writing
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setStep("outline")}
                    className="font-semibold hover:text-foreground"
                  >
                    Back to outline
                  </button>
                  <span className="inline-flex items-center gap-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      {writingLabel || "Scribe is working…"}
                    </span>
                    {busy ? (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-destructive/40 hover:text-destructive"
                      >
                        <Square className="size-3 fill-current" aria-hidden="true" />
                        Stop
                      </button>
                    ) : null}
                  </span>
                </div>
              )}
            </>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The cover's place beside the chapters: a waiting frame while it is drawn,
 * the picture the moment it lands. This is the best moment of the product,
 * so the arrival gets a little ceremony and a failure gets a whisper.
 */
function CoverSlot({
  status,
  url,
  title,
}: {
  status: CoverStatus;
  url: string | null;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (status === "ready" && url) {
    return (
      <figure className="rounded-2xl border border-border/80 p-3">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Cover of ${title}`}
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-700 ease-out ${
              loaded ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
            }`}
          />
        </div>
        <figcaption className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Check className="size-3.5" aria-hidden="true" />
          Your cover is here
        </figcaption>
      </figure>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-2xl border border-border/80 p-3">
        <div className="flex aspect-[2/3] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-3 text-center">
          <BookImage className="size-5 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            The cover didn&apos;t come through. You can draw one in the studio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 p-3" role="status" aria-live="polite">
      <div className="flex aspect-[2/3] animate-pulse flex-col items-center justify-center rounded-lg bg-primary-soft px-3 text-center">
        <BookImage className="size-5 text-primary-strong" aria-hidden="true" />
        <p className="mt-2 text-[11px] font-semibold text-primary-strong">Drawing your cover…</p>
      </div>
    </div>
  );
}

function ChecklistRow({
  done,
  label,
  children,
}: {
  done?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 py-3 last:border-b-0">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        {done ? (
          <Check className="size-3.5 text-emerald-700" />
        ) : (
          <span className="size-3.5 rounded-full border border-border" />
        )}
        {label}
      </p>
      <div className="mt-2 pl-5 text-sm">{children}</div>
    </div>
  );
}
