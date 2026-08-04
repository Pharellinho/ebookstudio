import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#000000",
          padding: 64,
          border: "16px solid #000000",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#d4a017",
              border: "4px solid #000000",
              borderRadius: 16,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6a2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 12 5.5v13A1.5 1.5 0 0 0 10.5 17H6a2 2 0 0 1-2-2Z"
                fill="#000000"
              />
              <path
                d="M20 6a2 2 0 0 0-2-2h-4.5A1.5 1.5 0 0 0 12 5.5v13A1.5 1.5 0 0 1 13.5 17H18a2 2 0 0 0 2-2Z"
                fill="#000000"
                opacity="0.55"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            {site.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            {site.tagline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#52525b",
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            One idea in. A store-ready ebook out — PDF, EPUB and DOCX.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              background: "#d4a017",
              border: "3px solid #000000",
              borderRadius: 999,
              padding: "14px 28px",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            Join the waitlist
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            ebookstudioai.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
