"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { IDEA_MAX_LENGTH, saveHandoffIdea } from "@/lib/idea-handoff";

const suggestions = [
  "A meal-prep playbook for shift workers",
  "Getting your first freelance client",
  "A calm-evening routine for parents",
];

export function IdeaForm({
  autoFocus = false,
  compact = false,
}: {
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const disabled = idea.trim().length === 0;

  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);

  /* Same channel as the homepage box: the idea waits in sessionStorage while
     the visitor signs up, and ScribeFlow on /create picks it up. Never a query
     string — that would put the text in logs, history and referrers. */
  function submit() {
    if (disabled) return;
    saveHandoffIdea(idea.trim());
    router.push("/signup");
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="relative rounded-3xl border border-border bg-background p-1 shadow-lg transition-shadow duration-200 focus-within:border-primary/50 focus-within:shadow-xl"
      >
        <label htmlFor="idea" className="sr-only">
          Describe the book you want to build
        </label>
        <textarea
          id="idea"
          name="idea"
          ref={field}
          rows={compact ? 2 : 3}
          maxLength={IDEA_MAX_LENGTH}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="A beginner's guide to…"
          className="w-full resize-none rounded-3xl bg-transparent px-5 py-4 pr-16 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Start building your book"
          className="absolute bottom-3 right-3 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-all duration-200 hover:bg-primary-strong disabled:cursor-not-allowed disabled:bg-primary/35 disabled:shadow-none"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setIdea(suggestion)}
            className="cursor-pointer rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
