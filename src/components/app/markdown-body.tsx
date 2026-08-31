"use client";

import Markdown from "react-markdown";

export function MarkdownBody({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content.trim()) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>Waiting…</p>
    );
  }

  return (
    <div
      className={`ebook-prose font-book text-[15px] leading-relaxed text-foreground/90 ${className}`}
    >
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-display mb-3 text-2xl font-bold tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display mb-2 mt-6 text-xl font-semibold">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display mb-2 mt-5 text-lg font-semibold">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-primary pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-semibold text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
