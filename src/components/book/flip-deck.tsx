"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { PageFlip } from "page-flip";
import type { PageFlipSettings } from "page-flip";

/* Page turning is StPageFlip's job. It takes real DOM nodes and moves them
   into its own structure, so FlipDeck is the only place allowed to touch the
   page elements — whoever renders the pages (the landing's sample books, the
   studio's paginated chapters) never does. */

export const FLIP_SETTINGS = {
  /* 2:3, the ratio the deck has always used (aspect-2/3). With size "stretch"
     these two numbers are the ratio, not fixed pixels. */
  width: 320,
  height: 480,
  size: "stretch",
  /* Portrait needs blockWidth < minWidth * 2, and the slide is at most 320px,
     so 200 keeps the deck on a single page at every breakpoint. */
  minWidth: 200,
  maxWidth: 420,
  minHeight: 300,
  maxHeight: 630,
  autoSize: true,
  usePortrait: true,
  /* showCover exists only to turn page 0 into a rigid board cover. This deck
     wants every page to curl alike, so it stays off — see the density pass
     after loadFromHTML for the rest of the story. */
  showCover: false,
  drawShadow: true,
  maxShadowOpacity: 0.5,
  flippingTime: 700,
  swipeDistance: 24,
  mobileScrollSupport: true,
  clickEventForward: true,
  useMouseEvents: true,
} satisfies Partial<PageFlipSettings>;

export type DeckControls = {
  next: () => void;
  prev: () => void;
  /** Jump to a page index; animated unless motion is reduced. */
  goTo: (index: number) => void;
};

export type DeckOrientation = "portrait" | "landscape";

/**
 * The size StPageFlip gives one page for a given block width, computed the
 * way its own calculateBoundsRect does in "stretch" mode. Whoever lays out
 * fixed-size pages can scale them to this without reading the library's
 * internals on every frame.
 */
export function deckPageSize(
  blockWidth: number,
  settings: Pick<
    Required<PageFlipSettings>,
    "width" | "height" | "minWidth" | "maxWidth" | "usePortrait"
  >,
): { pageWidth: number; pageHeight: number; orientation: DeckOrientation } {
  const ratio = settings.width / settings.height;
  const orientation: DeckOrientation =
    blockWidth < settings.minWidth * 2 && settings.usePortrait ? "portrait" : "landscape";
  let pageWidth = orientation === "portrait" ? blockWidth : blockWidth / 2;
  if (pageWidth > settings.maxWidth) pageWidth = settings.maxWidth;
  return { pageWidth, pageHeight: pageWidth / ratio, orientation };
}

/**
 * Hands the page elements to StPageFlip and takes them back on teardown.
 *
 * `pages` are already-rendered React nodes, one per page, in reading order.
 * The deck is built once per mount for a given page count: give it a `key`
 * when the book itself changes.
 */
export function FlipDeck({
  pages,
  controls,
  onIndexChange,
  onInteract,
  onLayout,
  settings,
}: {
  pages: ReactNode[];
  controls: RefObject<DeckControls | null>;
  onIndexChange: (index: number) => void;
  onInteract: () => void;
  /** The page size StPageFlip settled on, whenever it changes. */
  onLayout?: (layout: { pageWidth: number; pageHeight: number; orientation: DeckOrientation }) => void;
  /** Overrides merged over FLIP_SETTINGS. */
  settings?: Partial<PageFlipSettings>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onIndexChange, onInteract, onLayout });
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  /* Settings are compared by value so a caller can pass an inline object. */
  const settingsKey = JSON.stringify(settings ?? {});
  const pageCount = pages.length;

  useEffect(() => {
    handlers.current = { onIndexChange, onInteract, onLayout };
  });

  useEffect(() => {
    const mount = host.current;
    const source = shelf.current;
    if (!mount || !source) return;

    const pages = Array.from(
      source.querySelectorAll<HTMLElement>("[data-flip-page]"),
    );
    if (pages.length === 0) return;

    const merged = { ...FLIP_SETTINGS, ...(JSON.parse(settingsKey) as Partial<PageFlipSettings>) };

    /* destroy() removes the element it was given, so StPageFlip gets a plain
       div of its own instead of one React is holding a ref to. */
    const block = document.createElement("div");
    mount.appendChild(block);

    const flip = new PageFlip(block, {
      ...merged,
      /* Reduced motion: no corner peek, no flip on click. The pointer is also
         sealed off in CSS below, so only the arrow buttons turn pages — and
         they jump instead of animating. */
      showPageCorners: !reduceMotion,
      disableFlipByClick: reduceMotion,
      flippingTime: reduceMotion ? 1 : merged.flippingTime,
    });

    flip.on("flip", (event) => handlers.current.onIndexChange(event.data as number));
    flip.on("changeState", (event) => {
      if (event.data !== "read") handlers.current.onInteract();
    });

    flip.loadFromHTML(pages);

    /* Building its landscape spread, StPageFlip marks the cover — and, on an
       odd page count, the last page — "hard", which turns them into stiff
       board instead of paper. Portrait never uses that spread, so put every
       page back to soft and the whole book bends the same way. A deck that
       asks for a cover keeps it as board. */
    if (!merged.showCover) {
      for (let position = 0; position < flip.getPageCount(); position += 1) {
        const page = flip.getPage(position);
        page.setDensity("soft");
        page.setDrawingDensity("soft");
      }
    }

    controls.current = reduceMotion
      ? {
          next: () => flip.turnToNextPage(),
          prev: () => flip.turnToPrevPage(),
          goTo: (index) => flip.turnToPage(index),
        }
      : {
          next: () => flip.flipNext(),
          prev: () => flip.flipPrev(),
          goTo: (index) => flip.flip(index),
        };

    /* Tell the owner what size a page ended up, so fixed-size page content
       can be scaled to it. Only decks that ask get the observer. */
    let observer: ResizeObserver | null = null;
    if (handlers.current.onLayout) {
      const report = () => {
        const width = block.clientWidth;
        if (width > 0) handlers.current.onLayout?.(deckPageSize(width, merged));
      };
      observer = new ResizeObserver(report);
      observer.observe(block);
      report();
    }

    return () => {
      controls.current = null;
      observer?.disconnect();
      flip.destroy();

      /* StPageFlip starts a requestAnimationFrame loop and never calls
         cancelAnimationFrame, so a destroyed instance would keep drawing
         detached nodes for the life of the tab. Emptying the page collection
         releases the DOM and blanking the frame callback stops the work. */
      flip.getPageCollection().destroy();
      flip.getRender().render = () => {};

      block.remove();

      /* The pages were moved into StPageFlip's DOM and detached with it. Give
         them back so React unmounts the tree it thinks it still owns. */
      for (const page of pages) {
        page.removeAttribute("style");
        page.className = "";
        source.appendChild(page);
      }
    };
  }, [pageCount, controls, reduceMotion, settingsKey]);

  return (
    <div className="relative w-full">
      {/* Where the pages are rendered before StPageFlip moves them out. Kept
          transparent rather than display:none so the images still load. */}
      <div
        ref={shelf}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0"
      >
        {pages.map((page, position) => (
          <div key={position} data-flip-page="" data-density="soft">
            {page}
          </div>
        ))}
      </div>

      <div
        ref={host}
        className={reduceMotion ? "pointer-events-none" : "cursor-grab"}
      />
    </div>
  );
}
