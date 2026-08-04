"use client";

import Image from "next/image";
import { Logo } from "@/components/logo";

const platforms = [
  {
    name: "Amazon KDP",
    logo: "/platforms/amazon-kdp.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "Apple Books",
    logo: "/platforms/apple-books.webp",
    logoClass: "h-9 w-auto",
  },
  {
    name: "Etsy",
    logo: "/platforms/etsy.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "Gumroad",
    logo: "/platforms/gumroad.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "Shopify",
    logo: "/platforms/shopify.svg",
    logoClass: "h-8 w-8",
  },
  {
    name: "Kobo",
    logo: "/platforms/kobo.svg",
    logoClass: "h-7 w-auto max-w-[4.5rem]",
  },
  {
    name: "Instagram",
    logo: "/platforms/instagram.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "TikTok",
    logo: "/platforms/tiktok.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "Facebook",
    logo: "/platforms/facebook.webp",
    logoClass: "h-8 w-auto",
  },
  {
    name: "Your site",
    logo: "/platforms/your-site.svg",
    logoClass: "h-8 w-8",
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

export function Platforms() {
  return (
    <section className="border-y border-border bg-surface-warm py-20 lg:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2">
            <p className="eyebrow-pill">Distribution</p>
            <span className="text-sm font-medium text-muted-foreground">
              Sell wherever your readers are
            </span>
          </div>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            Your ebook, ready for every platform you sell on
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            EbookStudio exports the exact formats these platforms want, so you
            can list and start selling the same day.
          </p>
        </div>

        <div className="relative mx-auto mt-16 hidden aspect-square w-full max-w-[640px] lg:block lg:max-w-[720px]">
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
              strokeOpacity="0.2"
              strokeWidth="1.5"
              strokeDasharray="2 9"
            />

            {platforms.map((platform, index) => {
              const end = pointAt(platform.angle, RADIUS);
              const pathId = `spoke-${platform.name.replace(/\s+/g, "-")}`;

              return (
                <g key={platform.name}>
                  <path
                    id={pathId}
                    d={`M ${CX} ${CY} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
                    stroke="currentColor"
                    className="text-primary"
                    strokeOpacity="0.45"
                    strokeWidth="2"
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

                  <g>
                    <rect
                      x="-18"
                      y="-12"
                      width="36"
                      height="24"
                      rx="8"
                      className="fill-primary stroke-foreground"
                      strokeWidth="2"
                    />
                    <text
                      textAnchor="middle"
                      y="4"
                      className="fill-foreground"
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                      }}
                    >
                      {index % 3 === 0
                        ? "PDF"
                        : index % 3 === 1
                          ? "EPUB"
                          : "DOCX"}
                    </text>
                    <animateMotion
                      dur="2.8s"
                      repeatCount="indefinite"
                      begin={`${0.4 + index * 0.35}s`}
                      rotate="0"
                    >
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </g>
                </g>
              );
            })}
          </svg>

          {platforms.map((platform) => {
            const position = pointAt(platform.angle, RADIUS);
            return (
              <div
                key={platform.name}
                className="absolute z-10 flex size-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-2 border-foreground bg-background p-2.5 shadow-md sm:size-[96px]"
                style={{
                  left: `${(position.x / SIZE) * 100}%`,
                  top: `${(position.y / SIZE) * 100}%`,
                }}
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

          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-foreground bg-background px-6 py-4 shadow-lg">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/20 blur-xl" />
            <Logo />
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:hidden">
          {platforms.map((platform) => (
            <li
              key={platform.name}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-foreground bg-background px-4 py-5 shadow-md"
            >
              <Image
                src={platform.logo}
                alt=""
                width={72}
                height={48}
                className="h-10 w-auto object-contain"
              />
              <span className="font-display text-xs font-extrabold">
                {platform.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
