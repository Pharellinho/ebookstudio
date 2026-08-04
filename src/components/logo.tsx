import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label={`${site.name} home`}
    >
      <span className="inline-flex size-7 items-center justify-center rounded-md border-2 border-foreground bg-primary shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-4 text-foreground"
        >
          <path
            d="M4 6a2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 12 5.5v13A1.5 1.5 0 0 0 10.5 17H6a2 2 0 0 1-2-2Z"
            fill="currentColor"
          />
          <path
            d="M20 6a2 2 0 0 0-2-2h-4.5A1.5 1.5 0 0 0 12 5.5v13A1.5 1.5 0 0 1 13.5 17H18a2 2 0 0 0 2-2Z"
            fill="currentColor"
            opacity="0.55"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">
        ebook<span className="underline decoration-primary decoration-4 underline-offset-2">studio</span>
      </span>
    </Link>
  );
}
