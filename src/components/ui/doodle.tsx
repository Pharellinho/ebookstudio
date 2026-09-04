import { cn } from "@/lib/cn";

/**
 * Hand-drawn accents laid over the page: a circle around a headline, a
 * sparkle, an arrow, an underline. Static SVG, no client code.
 *
 * Every doodle is decorative: aria-hidden, no pointer events, and meant to be
 * positioned absolutely inside a `relative` parent so it never moves layout.
 * Colour comes from the parent text colour (`text-primary` or
 * `text-primary-strong`).
 */
export type DoodleKind =
  | "circle"
  | "sparkle"
  | "arrow-down-right"
  | "arrow-up"
  | "underline";

type DoodleProps = {
  kind: DoodleKind;
  className?: string;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function Doodle({ kind, className }: DoodleProps) {
  const shared = {
    "aria-hidden": true,
    focusable: "false",
    className: cn("pointer-events-none select-none", className),
  } as const;

  switch (kind) {
    case "circle":
      return (
        <svg viewBox="0 0 1000 282" {...shared}>
          <path
            {...stroke}
            d="M62 158C74 68 258 24 500 20C742 16 950 54 962 142C974 230 742 268 496 266C250 264 60 234 46 152C39 111 78 76 146 52"
          />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 28 28" {...shared}>
          <path
            fill="currentColor"
            d="M14 3c.9 7.3 6.4 12.8 13.7 13.7-7.3.9-12.8 6.4-13.7 13.7-.9-7.3-6.4-12.8-13.7-13.7 7.3-.9 12.8-6.4 13.7-13.7z"
          />
        </svg>
      );
    case "arrow-down-right":
      return (
        <svg viewBox="0 0 66 52" {...shared}>
          <path {...stroke} d="M4 6c22 2 38 14 44 34" />
          <path {...stroke} d="M40 34l8 8 6-9" />
        </svg>
      );
    case "arrow-up":
      return (
        <svg viewBox="0 0 58 50" {...shared}>
          <path {...stroke} d="M50 44C34 40 20 28 16 8" />
          <path {...stroke} d="M8 18l8-11 10 6" />
        </svg>
      );
    case "underline":
      return (
        <svg viewBox="0 0 130 15" {...shared}>
          <path {...stroke} d="M4 8.5C26 4 68 2.6 126 5.4" />
          <path
            {...stroke}
            strokeWidth={2.2}
            opacity={0.5}
            d="M10 13c24-3.4 62-4.4 112-2.2"
          />
        </svg>
      );
  }
}
