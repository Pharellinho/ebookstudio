import type { CoverWrapDimensions } from "@/lib/export/cover-wrap";

/**
 * Amazon KDP's own cover arithmetic, as published in its paperback cover
 * calculator ("Paperback Submission Guidelines" › cover dimensions). The
 * numbers here are Amazon's, not ours: spine width is the page count times
 * a per-paper thickness, and the bleed is 0.125 in on every side.
 *
 *   white paper            0.002252 in per page
 *   cream paper            0.0025   in per page
 *   premium colour paper   0.002347 in per page
 *
 * Lulu and other printers hand back their dimensions through their API;
 * they never go through this file.
 */

export type KdpPaper = "white" | "cream" | "color";

const THICKNESS_IN: Record<KdpPaper, number> = {
  white: 0.002252,
  cream: 0.0025,
  color: 0.002347,
};

export const KDP_BLEED_IN = 0.125;
/** KDP does not print fewer pages than this. */
export const KDP_MIN_PAGES = 24;
/** Below this many pages KDP prints no text on the spine. */
export const KDP_MIN_PAGES_FOR_SPINE_TEXT = 79;

export function kdpSpineWidth(pageCount: number, paper: KdpPaper): number {
  return Math.round(pageCount * THICKNESS_IN[paper] * 10000) / 10000;
}

/** The full wrap KDP expects for a given interior: trim, pages and paper. */
export function kdpCoverDimensions(input: {
  pageCount: number;
  trimWidth: number;
  trimHeight: number;
  paper: KdpPaper;
}): CoverWrapDimensions {
  const spineWidth = kdpSpineWidth(input.pageCount, input.paper);
  return {
    totalWidth: input.trimWidth * 2 + spineWidth + KDP_BLEED_IN * 2,
    height: input.trimHeight + KDP_BLEED_IN * 2,
    spineWidth,
    bleed: KDP_BLEED_IN,
    safety: 0.5,
  };
}
