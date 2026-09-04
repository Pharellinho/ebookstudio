"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  /** Milliseconds to stagger this element behind its siblings. */
  delay?: number;
  className?: string;
  /** Render as something other than a div (li, article, h2…) so Reveal can sit
   *  inside a grid or a list without adding a wrapper that breaks the layout. */
  as?: ElementType;
  style?: CSSProperties;
};

/**
 * Fades and lifts its children into place the first time they enter the
 * viewport, then stops observing.
 *
 * The hidden state lives in CSS (`[data-reveal="hidden"]` in globals.css), not
 * here, so that:
 *   - without JavaScript the content is simply visible — the rule is wrapped in
 *     `@media (scripting: enabled)`;
 *   - with `prefers-reduced-motion` the content is visible immediately and no
 *     transition runs at all.
 * Only opacity and transform move, so nothing reflows and no layout shift.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
  style,
}: RevealProps) {
  const nodeRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Very old browsers with no IntersectionObserver: show the content on the
    // next frame rather than leaving it stuck at opacity 0.
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={nodeRef}
      data-reveal={shown ? "shown" : "hidden"}
      className={cn(className)}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </Tag>
  );
}
