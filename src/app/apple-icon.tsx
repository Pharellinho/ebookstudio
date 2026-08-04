import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d4a017",
          border: "10px solid #000000",
          borderRadius: 36,
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 24 24"
          fill="none"
        >
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
    ),
    { ...size },
  );
}
