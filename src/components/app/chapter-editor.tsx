"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { chapterExtensions } from "@/lib/editor/chapter-extensions";
import { applyFaithfulTextEncoding } from "@/lib/editor/faithful-text";
import { cn } from "@/lib/cn";

const SAVE_DEBOUNCE_MS = 2000;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

function friendlyError(status: number | null): string {
  if (status === 409) return "Scribe is still writing this book. Your edits are kept on screen; they will be saved once it finishes.";
  if (status === 413) return "This chapter is too long to save. Split it in two.";
  if (status === 404) return "This chapter no longer exists. Your text is still on screen — copy it before leaving.";
  if (status === null) return "Could not reach the server. Your text is safe on screen; saving again at your next pause.";
  return "Could not save. Your text is safe on screen; saving again at your next pause.";
}

/**
 * Rich-text editor for ONE chapter. Markdown in, markdown out: the chapter
 * body in the database stays markdown, and the editor never sees more than
 * the active chapter.
 *
 * Saves 2s after the last keystroke. A failed save keeps the text on screen
 * and tries again at the next pause — nothing typed is ever thrown away.
 */
export function ChapterEditor({
  bookId,
  chapterId,
  markdown,
  onSaved,
  onDraft,
}: {
  bookId: string;
  chapterId: string;
  markdown: string;
  /** Called with the markdown the server accepted, so the parent stays in step. */
  onSaved: (chapterId: string, markdown: string) => void;
  /** Called on every edit with the current markdown, for a live preview. */
  onDraft?: (chapterId: string, markdown: string) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  /* Anything the user typed that the server has not confirmed yet. */
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);

  const editor = useEditor(
    {
      extensions: chapterExtensions(),
      content: markdown,
      contentType: "markdown",
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "ebook-prose font-book min-h-[50vh] text-[15px] leading-relaxed text-foreground/90 outline-none",
          "aria-label": "Chapter text",
        },
      },
      onCreate: ({ editor: created }) => applyFaithfulTextEncoding(created),
      onUpdate: ({ editor: current, transaction }) => {
        if (!transaction.docChanged) return;
        dirty.current = true;
        onDraft?.(chapterId, current.getMarkdown());
        scheduleSave();
      },
    },
    // Rebuilt when the chapter changes: never more than one chapter loaded.
    [chapterId],
  );

  function scheduleSave() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
  }

  async function save() {
    if (!editor || editor.isDestroyed || !dirty.current) return;
    if (inFlight.current) {
      // A save is running: run again right after it, with the newer text.
      await inFlight.current;
      scheduleSave();
      return;
    }

    const body = editor.getMarkdown();
    setSaveState({ kind: "saving" });

    const run = (async () => {
      let status: number | null = null;
      let updatedAt: string | null = null;
      try {
        const res = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        status = res.status;
        const json = (await res.json().catch(() => null)) as { updatedAt?: string } | null;
        updatedAt = json?.updatedAt ?? null;
      } catch {
        status = null;
      }

      if (status !== 200) {
        setSaveState({ kind: "error", message: friendlyError(status) });
        return;
      }
      // Only what the server confirmed counts as saved. Typing that happened
      // meanwhile keeps `dirty` true through the next onUpdate.
      if (editor.getMarkdown() === body) dirty.current = false;
      onSaved(chapterId, body);
      setSaveState({ kind: "saved", at: updatedAt ? new Date(updatedAt) : new Date() });
    })();

    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }

  /* Leaving the page with unsaved edits: warn, and try to flush. */
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /* Unmount (chapter switch): fire a last save with whatever is pending. */
  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (dirty.current && editor && !editor.isDestroyed) {
        void save();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
          }
        : null,
  });

  if (!editor) return null;

  const tools = [
    { label: "Bold", icon: Bold, on: active?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, on: active?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Heading 2", icon: Heading2, on: active?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, on: active?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", icon: List, on: active?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, on: active?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, on: active?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/95 px-2 py-1.5 backdrop-blur">
        <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              aria-pressed={tool.on}
              onMouseDown={(event) => event.preventDefault()}
              onClick={tool.run}
              className={cn(
                "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                tool.on && "bg-primary-soft text-primary-strong",
              )}
            >
              <tool.icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div className="mt-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "saving") {
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  }
  if (state.kind === "saved") {
    return (
      <span className="text-xs text-muted-foreground">
        Saved{" "}
        {state.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return (
    <span role="alert" className="max-w-md text-xs text-destructive">
      {state.message}
    </span>
  );
}
