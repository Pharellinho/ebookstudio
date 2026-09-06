/** Shared by the studio and the cover routes, so both count the same way. */
export const COVERS_PER_RUN = 3;
/** Three runs per book, for the life of the book: nine covers at most. */
export const COVER_RUN_CAP = 3;
export const COVER_AUTHOR_MAX = 80;

export type CoverCandidate = {
  /** Path inside the private covers bucket. */
  path: string;
  createdAt: string;
  /** Which of the three art directions produced it. */
  variant: string;
};
