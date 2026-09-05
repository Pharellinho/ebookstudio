/**
 * Cover geometry and the layouts the studio offers. Shared by the React
 * preview, the PNG route and the studio picker, so they never disagree.
 *
 * KDP (checked September 2026): ideal 1,600 × 2,560 px, ratio 1.6:1,
 * minimum 625 × 1,000, JPEG or TIFF under 50 MB, RGB. We rasterise PNG at the
 * ideal size; the export step converts to JPEG for upload.
 */
export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 2560;

export const COVER_LAYOUTS = [
  { id: "centered", name: "Framed", hint: "Title above a framed illustration" },
  { id: "full", name: "Full bleed", hint: "Illustration edge to edge, text band at the foot" },
  { id: "band", name: "Colour band", hint: "Colour band on top, illustration below" },
  { id: "type", name: "Typographic", hint: "No illustration — type only" },
] as const;

export type CoverLayout = (typeof COVER_LAYOUTS)[number]["id"];

export function isCoverLayout(value: unknown): value is CoverLayout {
  return typeof value === "string" && COVER_LAYOUTS.some((layout) => layout.id === value);
}

/** 5 illustrations per book, for the life of the book. */
export const COVER_ART_CAP = 5;
export const COVER_DIRECTION_MAX = 200;
