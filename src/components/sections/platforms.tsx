"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/ui/reveal";

type ExportFormat = "EPUB" | "PDF" | "DOCX";

const platforms = [
  {
    name: "Amazon KDP",
    logo: "/platforms/amazon-kdp.webp",
    logoClass: "h-8 w-auto",
    format: "EPUB" as ExportFormat,
  },
  {
    name: "Apple Books",
    logo: "/platforms/apple-books.webp",
    logoClass: "h-9 w-auto",
    format: "EPUB" as ExportFormat,
  },
  {
    name: "Etsy",
    logo: "/platforms/etsy.webp",
    logoClass: "h-8 w-auto",
    format: "PDF" as ExportFormat,
  },
  {
    // Editable templates sell well here, so the Word file is the natural fit.
    name: "Gumroad",
    logo: "/platforms/gumroad.webp",
    logoClass: "h-8 w-auto",
    format: "DOCX" as ExportFormat,
  },
  {
    name: "Shopify",
    logo: "/platforms/shopify.svg",
    logoClass: "h-8 w-8",
    format: "PDF" as ExportFormat,
  },
  {
    name: "Kobo",
    logo: "/platforms/kobo.svg",
    logoClass: "h-7 w-auto max-w-[4.5rem]",
    format: "EPUB" as ExportFormat,
  },
  {
    name: "Instagram",
    logo: "/platforms/instagram.webp",
    logoClass: "h-8 w-auto",
    format: "PDF" as ExportFormat,
  },
  {
    name: "TikTok",
    logo: "/platforms/tiktok.webp",
    logoClass: "h-8 w-auto",
    format: "PDF" as ExportFormat,
  },
  {
    name: "Facebook",
    logo: "/platforms/facebook.webp",
    logoClass: "h-8 w-auto",
    format: "PDF" as ExportFormat,
  },
  {
    name: "Your site",
    logo: "/platforms/your-site.svg",
    logoClass: "h-8 w-8",
    format: "PDF" as ExportFormat,
  },
].map((platform, index, list) => ({
  ...platform,
  /** Evenly spaced around the hub, starting at the top. */
  angle: -90 + (360 / list.length) * index,
}));

/** Distance from hub centre to platform card centre, in SVG viewBox units. */
const RADIUS = 385;
const SIZE = 1000;
const CX = SIZE / 2;
const CY = SIZE / 2;

function pointAt(angleDeg: number, radius: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: CX + Math.cos(radians) * radius,
    y: CY + Math.sin(radians) * radius,
  };
}

/* ---------------------------------------------------------------------------
   The travelling labels.

   Every timing below comes from these four numbers. Each label leaves the hub
   at `index * STAGGER_MS`, flies for TRAVEL_MS, and its tile reacts at exactly
   `send + TRAVEL_MS` — the tile's delay is written as a CSS calc() over the
   same two variables, so the two cannot drift apart. The whole thing is one
   CSS animation per element that repeats every CYCLE_MS; no JavaScript timer,
   nothing to clean up on unmount.
--------------------------------------------------------------------------- */
const TRAVEL_MS = 900;
const STAGGER_MS = 350;
const REST_MS = 1200;
const POP_MS = 450;
const RING_MS = 600;
const CYCLE_MS = STAGGER_MS * (platforms.length - 1) + TRAVEL_MS + REST_MS;

/** Milliseconds into the cycle → keyframe percentage. */
const pct = (ms: number) => `${((ms / CYCLE_MS) * 100).toFixed(3)}%`;

/* Keyframes are generated from the constants so the fade points, the impact
   and the rest all stay in step with CYCLE_MS if the platform list changes.
   Travel = transform only, fade = opacity only: splitting them keeps the
   ease-out curve whole instead of restarting it at every opacity keyframe. */
const motionCss = `
@keyframes platform-travel {
  0% { transform: translate(-50%, -50%); }
  ${pct(TRAVEL_MS)}, 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))); }
}
@keyframes platform-label-fade {
  0% { opacity: 0; }
  ${pct(TRAVEL_MS * 0.15)}, ${pct(TRAVEL_MS * 0.9)} { opacity: 1; }
  ${pct(TRAVEL_MS)}, 100% { opacity: 0; }
}
@keyframes platform-pop {
  0%, ${pct(POP_MS)}, 100% { transform: scale(1); box-shadow: var(--shadow-sm); }
  ${pct(POP_MS / 2)} { transform: scale(1.05); box-shadow: var(--shadow-md); }
}
@keyframes platform-ring {
  0% { transform: scale(1); opacity: 0.5; }
  ${pct(RING_MS)}, 100% { transform: scale(1.2); opacity: 0; }
}
.platform-stage { container-type: inline-size; }
.platform-label { opacity: 0; }
.platform-tile::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid var(--color-primary);
  opacity: 0;
  pointer-events: none;
}
[data-reveal="shown"] .platform-label {
  animation:
    platform-travel ${CYCLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) var(--send) infinite,
    platform-label-fade ${CYCLE_MS}ms linear var(--send) infinite;
}
[data-reveal="shown"] .platform-tile {
  animation: platform-pop ${CYCLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--send) + ${TRAVEL_MS}ms) infinite;
}
[data-reveal="shown"] .platform-tile::after {
  animation: platform-ring ${CYCLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--send) + ${TRAVEL_MS}ms) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .platform-label { display: none; }
  [data-reveal="shown"] .platform-tile,
  [data-reveal="shown"] .platform-tile::after { animation: none !important; }
}
`;

export function Platforms() {
  return (
    <section className="py-28 lg:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="p" className="eyebrow-pill">
            Distribution
          </Reveal>
          <Reveal
            as="h2"
            delay={70}
            className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          >
            Ready for every platform you sell on
          </Reveal>
          <Reveal
            as="p"
            delay={140}
            className="mt-5 text-lg leading-relaxed text-muted-foreground"
          >
            We export the exact formats these platforms ask for.
          </Reveal>
        </div>

        <style>{motionCss}</style>

        {/* Reveal is the barrier: nothing below animates until the diagram
            has scrolled into view, exactly like the feature cards. */}
        <Reveal className="platform-stage relative mx-auto mt-20 hidden aspect-square w-full max-w-[640px] lg:block lg:max-w-[720px]">
          <svg
            className="absolute inset-0 size-full"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke="currentColor"
              className="text-primary"
              strokeOpacity="0.25"
              strokeWidth="1"
              strokeDasharray="2 9"
            />

            {platforms.map((platform, index) => {
              const end = pointAt(platform.angle, RADIUS);

              return (
                <path
                  key={platform.name}
                  d={`M ${CX} ${CY} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
                  stroke="currentColor"
                  className="text-primary"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 0,
                    animation: `spoke-draw 0.75s cubic-bezier(0.22, 1, 0.36, 1) ${
                      0.12 + index * 0.07
                    }s both`,
                  }}
                />
              );
            })}
          </svg>

          {/* The labels in flight. Decorative only: hidden from assistive
              tech, no pointer events. Each one starts on the hub centre and
              translates by (--dx, --dy) — the tile's offset expressed in
              container-width units, so it lands on the tile at every size. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[15]"
          >
            {platforms.map((platform, index) => {
              const position = pointAt(platform.angle, RADIUS);
              return (
                <span
                  key={platform.name}
                  className="platform-label absolute left-1/2 top-1/2 rounded-md border border-primary bg-background px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.06em] text-foreground shadow-sm"
                  style={
                    {
                      "--dx": `${(((position.x - CX) / SIZE) * 100).toFixed(3)}cqw`,
                      "--dy": `${(((position.y - CY) / SIZE) * 100).toFixed(3)}cqw`,
                      "--send": `${index * STAGGER_MS}ms`,
                    } as CSSProperties
                  }
                >
                  {platform.format}
                </span>
              );
            })}
          </div>

          {platforms.map((platform, index) => {
            const position = pointAt(platform.angle, RADIUS);
            return (
              <div
                key={platform.name}
                className="platform-tile absolute z-10 flex size-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-border bg-background p-2.5 shadow-sm sm:size-[96px]"
                style={
                  {
                    left: `${(position.x / SIZE) * 100}%`,
                    top: `${(position.y / SIZE) * 100}%`,
                    "--send": `${index * STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={96}
                  height={64}
                  className={`${platform.logoClass} object-contain`}
                />
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background px-6 py-4 shadow-md">
            <Logo />
          </div>
        </Reveal>

        <ul className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:hidden">
          {platforms.map((platform) => (
            <li
              key={platform.name}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-5 shadow-sm"
            >
              <Image
                src={platform.logo}
                alt=""
                width={72}
                height={48}
                className="h-10 w-auto object-contain"
              />
              <span className="font-display text-xs font-medium text-muted-foreground">
                {platform.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
