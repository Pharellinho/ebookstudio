"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const TYPE_MS = 45;
const PAUSE_MS = 1800;
const DELETE_MS = 25;
/** Breath between the last letter disappearing and the next phrase starting. */
const GAP_MS = 400;

type TypedPlaceholderProps = {
  /** Keep this array stable (a module-level constant): a new array restarts the loop. */
  phrases: readonly string[];
  className?: string;
};

/**
 * A placeholder that types itself out, waits, erases and moves on.
 *
 * It is decoration, not the field's label: the parent renders a real
 * `<label>` (sr-only) and this element is `aria-hidden`. The parent unmounts
 * it at the first focus or keystroke, which is what stops the loop for good —
 * the timer chain is cleared in the effect cleanup.
 *
 * With `prefers-reduced-motion` nothing moves: the first phrase is shown whole.
 */
export function TypedPlaceholder({ phrases, className }: TypedPlaceholderProps) {
  const [text, setText] = useState("");
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (phrases.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setText(phrases[0]);
      setAnimated(false);
      return;
    }

    setAnimated(true);
    let index = 0;
    let length = 0;
    let deleting = false;
    let timer = 0;

    const tick = () => {
      const phrase = phrases[index];

      if (!deleting) {
        length += 1;
        setText(phrase.slice(0, length));
        if (length >= phrase.length) {
          deleting = true;
          timer = window.setTimeout(tick, PAUSE_MS);
        } else {
          timer = window.setTimeout(tick, TYPE_MS);
        }
        return;
      }

      length -= 1;
      setText(phrase.slice(0, length));
      if (length <= 0) {
        deleting = false;
        index = (index + 1) % phrases.length;
        timer = window.setTimeout(tick, GAP_MS);
      } else {
        timer = window.setTimeout(tick, DELETE_MS);
      }
    };

    timer = window.setTimeout(tick, TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [phrases]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none select-none whitespace-pre-wrap text-muted-foreground/70",
        className,
      )}
    >
      {text}
      {animated ? (
        <span className="ml-px inline-block h-[1.05em] w-px translate-y-[0.18em] bg-primary" />
      ) : null}
    </span>
  );
}
