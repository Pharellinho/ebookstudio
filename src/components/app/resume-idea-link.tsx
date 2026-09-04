"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveHandoffIdea } from "@/lib/idea-handoff";

/**
 * Opens Scribe with a draft's idea already in the box. The text goes through
 * sessionStorage, the same channel the landing page uses — never a query
 * string, which would leak it into logs, history and referrers.
 */
export function ResumeIdeaLink({
  idea,
  className,
  children,
}: {
  idea: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <a
      href="/create"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        saveHandoffIdea(idea);
        router.push("/create");
      }}
    >
      {children}
    </a>
  );
}
