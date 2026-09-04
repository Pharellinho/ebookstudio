"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TypedPlaceholder } from "@/components/typed-placeholder";
import { IDEA_MAX_LENGTH, saveHandoffIdea } from "@/lib/idea-handoff";

/* Written in the product's voice: each one is a book someone could sell. */
const PROMPTS = [
  "A 30-day meal plan for people who hate cooking on weeknights",
  "The freelancer's guide to pricing work without underselling it",
  "A calm bedtime routine workbook for parents of toddlers",
  "How to grow tomatoes on a balcony, from seed to first harvest",
  "A coloring book of deep-sea creatures for curious kids",
] as const;

const EXAMPLES = [
  "A step-by-step guide to growing your first vegetable garden",
  "10 ways to grow Instagram followers without paid ads",
  "A calm evening routine for exhausted parents",
];

/**
 * The idea box at the top of the landing page.
 *
 * It never calls an API. On submit the text is parked in sessionStorage and
 * the visitor is sent to /signup; ScribeFlow on /create picks it up. The
 * 1200-character cap is comfort only — POST /api/books validates for real.
 */
export function HeroIdeaForm() {
  const router = useRouter();
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [idea, setIdea] = useState("");
  /* Flips at the first focus or keystroke and never flips back: that is what
     retires the typing animation for good. */
  const [touched, setTouched] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  function submit() {
    const trimmed = idea.trim();
    if (!trimmed) {
      setHint("Write one sentence about your book first.");
      textareaRef.current?.focus();
      return;
    }
    saveHandoffIdea(trimmed);
    router.push("/signup");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto mt-8 max-w-2xl text-left"
    >
      <label htmlFor={inputId} className="sr-only">
        Describe the book you want to write
      </label>

      <div className="relative rounded-3xl border border-border bg-background shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
        <textarea
          id={inputId}
          ref={textareaRef}
          name="idea"
          rows={3}
          maxLength={IDEA_MAX_LENGTH}
          value={idea}
          onChange={(event) => {
            setIdea(event.target.value);
            setTouched(true);
            setHint(null);
          }}
          onFocus={() => setTouched(true)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={touched ? "Describe your book in a sentence or two" : undefined}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className="block w-full resize-none bg-transparent px-5 pb-16 pt-4 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none sm:px-6 sm:pt-5"
        />

        {!touched && idea === "" ? (
          <TypedPlaceholder
            phrases={PROMPTS}
            className="absolute left-5 right-5 top-4 text-base leading-relaxed sm:left-6 sm:right-6 sm:top-5"
          />
        ) : null}

        <div className="absolute bottom-3 right-3 flex items-center gap-3">
          {idea.length > IDEA_MAX_LENGTH - 200 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {idea.length}/{IDEA_MAX_LENGTH}
            </span>
          ) : null}
          <button
            type="submit"
            aria-label="Start your book"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-colors duration-200 hover:bg-primary-strong"
          >
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {hint ? (
        <p
          id={`${inputId}-hint`}
          role="alert"
          className="mt-3 text-center text-sm text-destructive"
        >
          {hint}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setIdea(example);
              setTouched(true);
              setHint(null);
              textareaRef.current?.focus();
            }}
            className="cursor-pointer rounded-full border border-border bg-surface-warm px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-foreground/30 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
