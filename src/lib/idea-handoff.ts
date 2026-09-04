/**
 * Carries the idea typed on the landing page over to the signed-in studio.
 *
 * The landing never calls an API with it: the text sits in sessionStorage for
 * the life of the tab, the visitor goes through /signup, and ScribeFlow on
 * /create takes it out (and deletes it) on mount. It is deliberately never put
 * in the URL — a query string ends up in server logs, browser history and the
 * referrer sent to third parties.
 */

/** Client-side comfort limit. The real validation lives in POST /api/books. */
export const IDEA_MAX_LENGTH = 1200;

const STORAGE_KEY = "ebookstudio.pending-idea";

export function saveHandoffIdea(idea: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, idea.slice(0, IDEA_MAX_LENGTH));
  } catch {
    // Storage blocked (private mode, disabled site data): the visitor simply
    // types the idea again after signing up.
  }
}

/** Reads the pending idea and clears it in the same breath. */
export function takeHandoffIdea(): string | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (value === null) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const trimmed = value.trim().slice(0, IDEA_MAX_LENGTH);
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
