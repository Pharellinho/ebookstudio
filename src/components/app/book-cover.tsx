import type { CSSProperties } from "react";
import { COVER_HEIGHT, COVER_WIDTH, type CoverLayout } from "@/lib/cover-layouts";

/**
 * The cover, composed by our code on top of the generated illustration.
 *
 * Written with inline styles and flexbox only, so the very same component
 * renders in the studio (React DOM) and in the PNG route (Satori, which
 * knows no Tailwind, no CSS variables and no grid). Designed at KDP's
 * 1,600 × 2,560 and scaled down by whoever displays it.
 *
 * Changing the layout, the title or the author re-renders this; nothing
 * else. The illustration is the only part that ever costs a model call.
 */
export type BookCoverProps = {
  artUrl: string | null;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  accent: string;
  layout: CoverLayout;
  /** Font family strings the renderer knows: CSS vars in the DOM, loaded names in Satori. */
  displayFont?: string;
  textFont?: string;
  width?: number;
  height?: number;
};

function rgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLight(hex: string) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

const PAPER = "#fdfbf7";
const INK = "#111111";
const MUTED = "#52525b";

function titleSize(title: string, max: number) {
  if (title.length > 60) return Math.round(max * 0.62);
  if (title.length > 36) return Math.round(max * 0.78);
  return max;
}

export function BookCover({
  artUrl,
  title,
  subtitle,
  author,
  accent,
  layout,
  displayFont = "sans-serif",
  textFont = "sans-serif",
  width = COVER_WIDTH,
  height = COVER_HEIGHT,
}: BookCoverProps) {
  const onAccent = isLight(accent) ? INK : "#ffffff";
  const pad = Math.round(width * 0.075);

  const root: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width,
    height,
    overflow: "hidden",
    fontFamily: textFont,
  };

  const art = (style: CSSProperties) =>
    artUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={artUrl} alt="" style={{ objectFit: "cover", ...style }} />
    ) : (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: rgba(accent, 0.14),
          ...style,
        }}
      >
        <div style={{ display: "flex", width: Math.round(width * 0.12), height: 6, background: rgba(accent, 0.5) }} />
      </div>
    );

  const authorLine = author ? (
    <div
      style={{
        display: "flex",
        fontSize: Math.round(width * 0.03),
        letterSpacing: Math.round(width * 0.004),
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {author}
    </div>
  ) : null;

  if (layout === "full") {
    return (
      <div style={{ ...root, background: rgba(accent, 0.14) }}>
        {art({ position: "absolute", top: 0, left: 0, width, height })}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: pad,
            paddingTop: Math.round(pad * 0.8),
            background: accent,
            color: onAccent,
          }}
        >
          <div style={{ display: "flex", fontFamily: displayFont, fontSize: titleSize(title, Math.round(width * 0.085)), fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: Math.round(pad * 0.35), fontSize: Math.round(width * 0.034), lineHeight: 1.3, opacity: 0.85 }}>
              {subtitle}
            </div>
          ) : null}
          {authorLine ? <div style={{ display: "flex", marginTop: Math.round(pad * 0.6) }}>{authorLine}</div> : null}
        </div>
      </div>
    );
  }

  if (layout === "band") {
    const bandHeight = Math.round(height * 0.4);
    return (
      <div style={{ ...root, background: PAPER }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: bandHeight,
            padding: pad,
            background: accent,
            color: onAccent,
          }}
        >
          <div style={{ display: "flex", fontFamily: displayFont, fontSize: titleSize(title, Math.round(width * 0.09)), fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: Math.round(pad * 0.35), fontSize: Math.round(width * 0.034), lineHeight: 1.3, opacity: 0.85 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", position: "relative", width, height: height - bandHeight }}>
          {art({ width, height: height - bandHeight })}
          {authorLine ? (
            <div
              style={{
                position: "absolute",
                left: pad,
                bottom: Math.round(pad * 0.7),
                display: "flex",
                padding: `${Math.round(width * 0.012)}px ${Math.round(width * 0.025)}px`,
                background: PAPER,
                color: INK,
                borderRadius: 999,
              }}
            >
              {authorLine}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (layout === "type") {
    return (
      <div style={{ ...root, background: accent, color: onAccent, padding: pad, justifyContent: "space-between" }}>
        <div
          style={{
            position: "absolute",
            top: Math.round(pad * 0.5),
            left: Math.round(pad * 0.5),
            right: Math.round(pad * 0.5),
            bottom: Math.round(pad * 0.5),
            display: "flex",
            border: `4px solid ${rgba(onAccent === INK ? "#111111" : "#ffffff", 0.35)}`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", marginTop: Math.round(height * 0.16) }}>
          <div style={{ display: "flex", fontFamily: displayFont, fontSize: titleSize(title, Math.round(width * 0.115)), fontWeight: 700, lineHeight: 1.0, letterSpacing: -3 }}>
            {title}
          </div>
          <div style={{ display: "flex", width: Math.round(width * 0.12), height: 8, marginTop: Math.round(pad * 0.6), background: rgba(onAccent === INK ? "#111111" : "#ffffff", 0.6) }} />
          {subtitle ? (
            <div style={{ display: "flex", marginTop: Math.round(pad * 0.5), fontSize: Math.round(width * 0.038), lineHeight: 1.3, opacity: 0.85 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {authorLine ? <div style={{ display: "flex" }}>{authorLine}</div> : <div style={{ display: "flex" }} />}
      </div>
    );
  }

  // centered — framed illustration under the title, like the Balcony Garden sample.
  const frameWidth = width - pad * 2;
  const frameHeight = Math.round(height * 0.5);
  return (
    <div style={{ ...root, background: PAPER, color: INK, padding: pad, justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", width: Math.round(width * 0.06), height: 6, background: accent, marginBottom: Math.round(pad * 0.5) }} />
        <div style={{ display: "flex", justifyContent: "center", fontFamily: displayFont, fontSize: titleSize(title, Math.round(width * 0.085)), fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: Math.round(pad * 0.35), fontSize: Math.round(width * 0.032), lineHeight: 1.3, color: MUTED }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          width: frameWidth,
          height: frameHeight,
          overflow: "hidden",
          borderRadius: Math.round(width * 0.02),
          border: `6px solid ${accent}`,
        }}
      >
        {art({ width: frameWidth, height: frameHeight })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", color: accent }}>
        {authorLine ?? <div style={{ display: "flex" }} />}
      </div>
    </div>
  );
}
