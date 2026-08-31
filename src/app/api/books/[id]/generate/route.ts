import { auth } from "@clerk/nextjs/server";
import {
  getBookForUser,
  replaceOutlineChapters,
  updateBook,
  updateChapter,
} from "@/lib/books";
import { openaiConfigured } from "@/lib/generation/openai";
import { generateOutline, streamChapter } from "@/lib/generation/run";
import { checkRateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

const GENERATE_LIMIT = 6;
const GENERATE_WINDOW_MS = 60 * 60 * 1000;

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

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (book.status === "outlining" || book.status === "writing") {
    return new Response(JSON.stringify({ error: "already_generating" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
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

        const chapters = await replaceOutlineChapters(book.id, outline);

        const previousTitles: string[] = [];

        for (let index = 0; index < chapters.length; index++) {
          const chapter = chapters[index];
          const outlineChapter = outline.chapters[index];
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
          })) {
            body += chunk;
            send("chapter_delta", {
              id: chapter.id,
              position: chapter.position,
              delta: chunk,
            });
          }

          await updateChapter(chapter.id, {
            title: outlineChapter.title,
            body,
            status: "ready",
          });
          previousTitles.push(outlineChapter.title);
          send("chapter_done", {
            id: chapter.id,
            position: chapter.position,
            title: outlineChapter.title,
            body,
          });
        }

        await updateBook(book.id, { status: "ready" });
        send("done", { status: "ready", bookId: book.id });
      } catch (error) {
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
        controller.close();
      }
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
