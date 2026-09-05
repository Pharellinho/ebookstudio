import { auth } from "@clerk/nextjs/server";
import {
  getBookForUser,
  syncOutlineChapters,
  touchBook,
  updateBook,
  updateChapter,
} from "@/lib/books";
import { openaiConfigured } from "@/lib/generation/openai";
import { generateOutline, streamChapter } from "@/lib/generation/run";
import { checkRateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

/* Writing a whole book is minutes of streaming, and the platform cuts the
   response at its own ceiling regardless of what the code is doing. Without
   this the stream dies mid-book in production while working fine in dev.
   300s is the Vercel Pro / Fluid limit; drop it to 60 if a deploy rejects it. */
export const maxDuration = 300;

const GENERATE_LIMIT = 6;
const GENERATE_WINDOW_MS = 60 * 60 * 1000;

/* A run that has not touched the book for this long is dead, not busy: the
   connection dropped, or the function was cut off. Without this a single dead
   stream locks the book behind "already_generating" forever. */
const STALE_AFTER_MS = 5 * 60 * 1000;

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const isProd =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!origin) {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }

  const allowed = new Set(
    [
      site.url,
      `https://${site.domain}`,
      `https://www.${site.domain}`,
      ...(!isProd
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ].map((value) => value.replace(/\/$/, "")),
  );

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: Params) {
  if (!originAllowed(request)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!openaiConfigured()) {
    return new Response(JSON.stringify({ error: "openai_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const running = book.status === "outlining" || book.status === "writing";
  const lastTouch = Date.parse(book.updated_at);
  const stalled =
    !Number.isFinite(lastTouch) || Date.now() - lastTouch > STALE_AFTER_MS;

  if (running && !stalled) {
    return new Response(JSON.stringify({ error: "already_generating" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  /* Counted only once the request is going to do real work. Charging the
     limiter before the checks above let a stuck book burn the whole hourly
     allowance on 409s. */
  const rate = await checkRateLimit(`books:generate:${userId}`, {
    limit: GENERATE_LIMIT,
    windowMs: GENERATE_WINDOW_MS,
  });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  /* The client closing the tab, pressing Stop, or navigating away must stop
     the model too: without this the server kept writing — and paying for —
     the whole book into a connection nobody was reading. Chapters already
     marked ready stay ready, so a resume replays them instead of buying them
     again; the book simply goes back to "draft". */
  let cancelled = false;
  let closed = false;
  const stopEarly = async () => {
    if (cancelled) return;
    cancelled = true;
    try {
      await updateBook(book.id, { status: "draft", error: null });
    } catch (error) {
      console.error("could not reset book after cancel", error);
    }
  };
  request.signal.addEventListener("abort", () => void stopEarly(), {
    once: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed || cancelled) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        } catch {
          // The consumer is gone; the abort path takes it from here.
        }
      };

      try {
        const existingOutline = book.outline;
        let outline = existingOutline;

        if (
          existingOutline &&
          Array.isArray(existingOutline.chapters) &&
          existingOutline.chapters.length > 0 &&
          existingOutline.title
        ) {
          await updateBook(book.id, {
            status: "writing",
            error: null,
            title: existingOutline.title,
            subtitle: existingOutline.subtitle,
          });
          send("status", { status: "writing" });
          send("outline", {
            title: existingOutline.title,
            subtitle: existingOutline.subtitle,
            chapters: existingOutline.chapters,
          });
        } else {
          await updateBook(book.id, {
            status: "outlining",
            error: null,
          });
          send("status", { status: "outlining" });

          outline = await generateOutline({
            idea: book.idea,
            formatSlug: book.format_slug,
          });

          await updateBook(book.id, {
            title: outline.title,
            subtitle: outline.subtitle,
            outline,
            status: "writing",
          });

          send("outline", {
            title: outline.title,
            subtitle: outline.subtitle,
            chapters: outline.chapters,
          });
        }

        if (!outline) throw new Error("Missing outline");

        const chapters = await syncOutlineChapters(book.id, outline);

        const previousTitles: string[] = [];

        for (let index = 0; index < chapters.length; index++) {
          // Checked before every chapter so a cancel never buys one more.
          if (request.signal.aborted || cancelled) {
            await stopEarly();
            break;
          }

          const chapter = chapters[index];
          const outlineChapter = outline.chapters[index];

          /* Written on an earlier attempt. Replay it so the reader sees the
             whole book, without buying the same chapter twice. */
          if (chapter.status === "ready" && chapter.body.trim()) {
            previousTitles.push(chapter.title);
            send("chapter_done", {
              id: chapter.id,
              position: chapter.position,
              title: chapter.title,
              body: chapter.body,
            });
            continue;
          }

          await updateChapter(chapter.id, { status: "writing" });
          send("chapter_start", {
            id: chapter.id,
            position: chapter.position,
            title: outlineChapter.title,
          });

          let body = "";
          for await (const chunk of streamChapter({
            idea: book.idea,
            formatSlug: book.format_slug,
            bookTitle: outline.title,
            chapterTitle: outlineChapter.title,
            chapterSummary: outlineChapter.summary,
            chapterIndex: index,
            chapterTotal: chapters.length,
            previousTitles,
            signal: request.signal,
          })) {
            body += chunk;
            send("chapter_delta", {
              id: chapter.id,
              position: chapter.position,
              delta: chunk,
            });
          }

          /* An abort closes the OpenAI stream quietly, so the loop above can
             end with half a chapter. That text is not finished work: put the
             chapter back to pending so a resume writes it again in full. */
          if (request.signal.aborted || cancelled) {
            await updateChapter(chapter.id, { status: "pending", body: "" });
            await stopEarly();
            break;
          }

          await updateChapter(chapter.id, {
            title: outlineChapter.title,
            body,
            status: "ready",
          });
          previousTitles.push(outlineChapter.title);
          // Keeps the staleness check above honest during a long run.
          await touchBook(book.id);
          send("chapter_done", {
            id: chapter.id,
            position: chapter.position,
            title: outlineChapter.title,
            body,
          });
        }

        if (cancelled || request.signal.aborted) {
          await stopEarly();
          return;
        }

        await updateBook(book.id, { status: "ready" });
        send("done", { status: "ready", bookId: book.id });
      } catch (error) {
        // A stop mid-chapter surfaces as an abort error from the OpenAI
        // stream: that is a cancel, not a failure.
        if (cancelled || request.signal.aborted) {
          await stopEarly();
          return;
        }
        console.error("generate failed", error);
        const message =
          error instanceof Error ? error.message : "Generation failed";
        try {
          await updateBook(book.id, { status: "failed", error: message });
        } catch {
          // ignore secondary failure
        }
        send("error", { message });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed by the cancel.
        }
      }
    },
    cancel() {
      closed = true;
      void stopEarly();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
