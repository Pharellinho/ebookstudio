"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { formats } from "@/lib/content";
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

const EXAMPLES = [
  "A step-by-step guide to growing your first vegetable garden",
  "10 ways to grow Instagram followers organically without paid ads",
  "A calm evening routine for exhausted parents",
];

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
  const [credits, setCredits] = useState(25);
  const [chapterRange, setChapterRange] = useState("5–7");

  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomTitle, setShowCustomTitle] = useState(false);

  const [outlineChapters, setOutlineChapters] = useState<OutlineChapter[]>([]);
  const [subtitle, setSubtitle] = useState("");

  const [bookId, setBookId] = useState<string | null>(null);
  const [liveChapters, setLiveChapters] = useState<LiveChapter[]>([]);
  const [activePosition, setActivePosition] = useState(0);
  const [writingLabel, setWritingLabel] = useState("");

  const ebookFormats = useMemo(
    () => formats.filter((f) => f.slug !== "coloring-book"),
    [],
  );

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
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function buildBook() {
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

    try {
      const createRes = await fetch("/api/books", {
        method: "POST",
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
      const id = createJson.book.id;
      setBookId(id);

      const generateRes = await fetch(`/api/books/${id}/generate`, {
        method: "POST",
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
            router.push(`/studio/${id}`);
          }

          if (event === "error") {
            throw new Error(String(data.message ?? "Generation failed"));
          }
        }
      }
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("outline");
      setStatusLine("Scribe is ready when you are.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-background shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <p className="font-display text-sm font-bold">
              Scribe — your AI book agent
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
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
            <div className="ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm">
              {idea}
              {step === "format" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("idea");
                    setStatusLine("Scribe is listening.");
                  }}
                  className="mt-2 block text-xs font-semibold text-primary-strong"
                >
                  Edit idea
                </button>
              ) : null}
            </div>
          ) : null}

          {step === "format" ? (
            <>
              <p className="text-sm leading-relaxed">
                Got it — this looks like a{" "}
                <span className="font-semibold">{formatName}</span>. I&apos;ll
                plan {chapterRange} chapters (about {credits} credits). Change
                the format below if I got it wrong — otherwise let&apos;s plan
                it.
              </p>
              {formatReason ? (
                <p className="text-xs text-muted-foreground">{formatReason}</p>
              ) : null}

              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    We think this is a {formatName}
                  </p>
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Pencil className="size-3.5" />
                    <select
                      value={formatSlug}
                      onChange={(event) => {
                        const next = ebookFormats.find(
                          (f) => f.slug === event.target.value,
                        );
                        if (!next) return;
                        setFormatSlug(next.slug);
                        setFormatName(next.name);
                        setCredits(next.credits);
                        setChapterRange(next.chapters);
                      }}
                      className="cursor-pointer rounded-lg border border-border bg-background px-2 py-1"
                    >
                      {ebookFormats.map((format) => (
                        <option key={format.slug} value={format.slug}>
                          {format.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Language: English (default)
                </p>
              </div>

              <div className="flex justify-end">
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
            </>
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

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setStep("outline")}
                  className="font-semibold hover:text-foreground"
                >
                  Back to outline
                </button>
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Loader2 className="size-3.5 animate-spin" />
                  {writingLabel || "Scribe is working…"}
                </span>
              </div>
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
