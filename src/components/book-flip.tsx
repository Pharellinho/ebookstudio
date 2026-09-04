"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageFlip } from "page-flip";
import type { PageFlipSettings } from "page-flip";
import type { SampleBook, SamplePage } from "@/lib/samples";

const SLIDE_WIDTH = "min(20rem, 78vw)";
const SLIDE_GAP_PX = 20;
const AUTOPLAY_MS = 3800;
/** Wait after the pointer leaves before the carousel moves again. */
const RESUME_MS = 1400;
/** Slide glide when the user picks another book. */
const SLIDE_MS = 420;
/** Triple the deck so the track always has a neighbour on both sides. */
const LOOP_COPIES = 3;


function wrapIndex(value: number, length: number) {
  return ((value % length) + length) % length;
}

export function BookCarousel({ books }: { books: SampleBook[] }) {
  return (
    <>
      {/* Mobile: every cover is visible — tap one, then turn pages. */}
      <div className="lg:hidden">
        <MobileBookShelf books={books} />
      </div>
      {/* Desktop: cylinder carousel with side covers. */}
      <div className="hidden lg:block">
        <DesktopBookCarousel books={books} />
      </div>
    </>
  );
}

/** Clear picker of all sample covers — no swipe, no hidden neighbours. */
function MobileBookShelf({ books }: { books: SampleBook[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const reduceMotion = useRef(false);

  function pauseAutoplay() {
    window.clearTimeout(resumeTimer.current);
    setPaused(true);
  }

  function scheduleResume() {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      setPaused(false);
    }, RESUME_MS);
  }

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => window.clearTimeout(resumeTimer.current);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion.current) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % books.length);
    }, AUTOPLAY_MS);

    return () => clearInterval(timer);
  }, [paused, books.length]);

  const book = books[active];

  return (
    <div
      className="flex flex-col items-center"
      onPointerEnter={pauseAutoplay}
      onPointerLeave={scheduleResume}
      onFocusCapture={pauseAutoplay}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleResume();
        }
      }}
    >
      <ul className="grid w-full max-w-md grid-cols-4 gap-2.5 px-1">
        {books.map((item, position) => {
          const selected = position === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  pauseAutoplay();
                  setActive(position);
                }}
                aria-label={`Show ${item.title}`}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl p-1 transition-all ${
                  selected
                    ? "bg-primary/25 ring-2 ring-foreground"
                    : "opacity-70 ring-1 ring-border hover:opacity-100"
                }`}
              >
                <span
                  className="relative aspect-2/3 w-full overflow-hidden rounded-lg"
                  style={{ backgroundColor: item.tint }}
                >
                  <Image
                    src={item.cover}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </span>
                <span className="line-clamp-2 min-h-8 text-center text-[0.65rem] font-semibold leading-tight text-foreground">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Tap a cover, then turn the pages
      </p>

      <div className="mt-5 w-full max-w-[min(20rem,78vw)]">
        <BookFlip
          key={book.id}
          book={book}
          interactive
          live={paused}
          onInteract={pauseAutoplay}
        />
      </div>
    </div>
  );
}

function DesktopBookCarousel({ books }: { books: SampleBook[] }) {
  const count = books.length;
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [physical, setPhysical] = useState(count);
  const [slideSpan, setSlideSpan] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [paused, setPaused] = useState(false);
  const physicalRef = useRef(count);
  const sliding = useRef(false);
  const reduceMotion = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);

  const slides = Array.from({ length: count * LOOP_COPIES }, (_, index) => ({
    index,
    book: books[index % count],
  }));

  const measure = useCallback(() => {
    const first = track.current?.children[0] as HTMLElement | undefined;
    if (!first) return;
    setSlideSpan(first.getBoundingClientRect().width + SLIDE_GAP_PX);
  }, []);

  const goTo = useCallback(
    (position: number, { instant = false } = {}) => {
      if (sliding.current && !instant) return;
      if (position === physicalRef.current && !instant) return;

      const middle = count + wrapIndex(position, count);
      const target = instant ? middle : position;

      if (instant || reduceMotion.current) {
        sliding.current = false;
        setAnimate(false);
        physicalRef.current = middle;
        setPhysical(middle);
        return;
      }

      sliding.current = true;
      setAnimate(true);
      physicalRef.current = target;
      setPhysical(target);
    },
    [count],
  );

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== track.current) return;
    if (event.propertyName !== "transform") return;

    sliding.current = false;
    const position = physicalRef.current;
    const middle = count + wrapIndex(position, count);

    setAnimate(false);
    if (position !== middle) {
      physicalRef.current = middle;
      setPhysical(middle);
    }
  }

  function pauseAutoplay() {
    window.clearTimeout(resumeTimer.current);
    setPaused(true);
  }

  function scheduleResume() {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      setPaused(false);
    }, RESUME_MS);
  }

  function takeOver(position: number) {
    pauseAutoplay();
    goTo(position);
  }

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    measure();

    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (track.current?.children[0]) {
      observer.observe(track.current.children[0] as HTMLElement);
    }

    return () => {
      observer.disconnect();
      window.clearTimeout(resumeTimer.current);
    };
  }, [measure, count]);

  useEffect(() => {
    if (paused) return;
    if (reduceMotion.current) return;

    const timer = setInterval(() => {
      goTo(physicalRef.current + 1);
    }, AUTOPLAY_MS);

    return () => clearInterval(timer);
  }, [paused, goTo]);

  const offset = slideSpan > 0 ? physical * slideSpan : 0;

  return (
    <div
      onPointerEnter={pauseAutoplay}
      onPointerLeave={scheduleResume}
      onFocusCapture={pauseAutoplay}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleResume();
        }
      }}
    >
      <div ref={viewport} className="relative overflow-hidden py-10">
        <div
          ref={track}
          onTransitionEnd={handleTransitionEnd}
          className="flex will-change-transform"
          style={{
            gap: SLIDE_GAP_PX,
            paddingInline: `max(0px, calc((100% - ${SLIDE_WIDTH}) / 2))`,
            transform: slideSpan > 0 ? `translate3d(${-offset}px, 0, 0)` : undefined,
            transition: animate
              ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : "none",
          }}
        >
          {slides.map((slide) => {
            const isActive = slide.index === physical;
            return (
              <div
                key={`${slide.book.id}-${slide.index}`}
                className="relative shrink-0"
                style={{ width: SLIDE_WIDTH }}
                aria-hidden={isActive ? undefined : true}
              >
                <div
                  className="transition-[opacity,transform] duration-300 ease-out"
                  style={{
                    opacity: isActive ? 1 : 0.4,
                    transform: isActive ? undefined : "scale(0.92)",
                  }}
                >
                  <BookFlip
                    book={slide.book}
                    interactive={isActive}
                    live={isActive && paused}
                    onInteract={pauseAutoplay}
                  />
                </div>

                {isActive ? null : (
                  <button
                    type="button"
                    aria-label={`Show ${slide.book.title}`}
                    onClick={() => takeOver(slide.index)}
                    className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Page turning is StPageFlip's job from here down. It takes real DOM nodes and
   moves them into its own structure, so FlipDeck is the only place allowed to
   touch the page elements — everything above (carousel, autoplay) and every
   page component below is unchanged. */

const FLIP_SETTINGS = {
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

type DeckControls = { next: () => void; prev: () => void };

/** Hands the page elements to StPageFlip and takes them back on teardown. */
function FlipDeck({
  book,
  controls,
  onIndexChange,
  onInteract,
}: {
  book: SampleBook;
  controls: React.RefObject<DeckControls | null>;
  onIndexChange: (index: number) => void;
  onInteract: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onIndexChange, onInteract });
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    handlers.current = { onIndexChange, onInteract };
  });

  useEffect(() => {
    const mount = host.current;
    const source = shelf.current;
    if (!mount || !source) return;

    const pages = Array.from(
      source.querySelectorAll<HTMLElement>("[data-flip-page]"),
    );
    if (pages.length === 0) return;

    /* destroy() removes the element it was given, so StPageFlip gets a plain
       div of its own instead of one React is holding a ref to. */
    const block = document.createElement("div");
    mount.appendChild(block);

    const flip = new PageFlip(block, {
      ...FLIP_SETTINGS,
      /* Reduced motion: no corner peek, no flip on click. The pointer is also
         sealed off in CSS below, so only the arrow buttons turn pages — and
         they jump instead of animating. */
      showPageCorners: !reduceMotion,
      disableFlipByClick: reduceMotion,
      flippingTime: reduceMotion ? 1 : FLIP_SETTINGS.flippingTime,
    });

    flip.on("flip", (event) => handlers.current.onIndexChange(event.data));
    flip.on("changeState", (event) => {
      if (event.data !== "read") handlers.current.onInteract();
    });

    flip.loadFromHTML(pages);

    /* Building its landscape spread, StPageFlip marks the cover — and, on an
       odd page count, the last page — "hard", which turns them into stiff
       board instead of paper. Portrait never uses that spread, so put every
       page back to soft and the whole book bends the same way. */
    for (let position = 0; position < flip.getPageCount(); position += 1) {
      const page = flip.getPage(position);
      page.setDensity("soft");
      page.setDrawingDensity("soft");
    }

    controls.current = reduceMotion
      ? {
          next: () => flip.turnToNextPage(),
          prev: () => flip.turnToPrevPage(),
        }
      : { next: () => flip.flipNext(), prev: () => flip.flipPrev() };

    return () => {
      controls.current = null;
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
  }, [book, controls, reduceMotion]);

  return (
    <div className="relative w-full">
      {/* Where the pages are rendered before StPageFlip moves them out. Kept
          transparent rather than display:none so the images still load. */}
      <div
        ref={shelf}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0"
      >
        {book.pages.map((page, position) => (
          <div key={position} data-flip-page="" data-density="soft">
            <PageCard page={page} book={book} fill />
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

function BookFlip({
  book,
  interactive,
  live,
  onInteract,
}: {
  book: SampleBook;
  /** This is the slide the carousel is showing. */
  interactive: boolean;
  /** Autoplay is held, so the deck is worth building and the reader can use it. */
  live: boolean;
  onInteract: () => void;
}) {
  const [index, setIndex] = useState(0);
  const controls = useRef<DeckControls | null>(null);
  const total = book.pages.length;

  // Coming back to a book should feel like picking it up again, not resuming.
  useEffect(() => {
    if (!live) setIndex(0);
  }, [live]);

  return (
    <figure className="flex flex-col items-center">
      <div
        className="relative w-full"
        role="group"
        aria-roledescription="book preview"
        aria-label={`${book.title}, page ${index + 1} of ${total}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 bottom-0 h-8 translate-y-3 rounded-[50%] bg-foreground/20 blur-lg"
        />

        {live ? (
          <FlipDeck
            key={book.id}
            book={book}
            controls={controls}
            onIndexChange={setIndex}
            onInteract={onInteract}
          />
        ) : (
          <PageCard
            page={book.pages[0]}
            book={book}
            priority={interactive}
          />
        )}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <CarouselButton
          label="Previous page"
          disabled={!live || index === 0}
          onClick={() => {
            onInteract();
            controls.current?.prev();
          }}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </CarouselButton>
        <span className="min-w-16 text-center text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} of {total}
        </span>
        <CarouselButton
          label="Next page"
          disabled={!live || index === total - 1}
          onClick={() => {
            onInteract();
            controls.current?.next();
          }}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </CarouselButton>
      </div>

      <figcaption className="mt-4 text-center">
        <p className="font-display text-base font-bold">{book.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{book.meta}</p>
      </figcaption>
    </figure>
  );
}

function CarouselButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
    >
      {children}
    </button>
  );
}

function PageCard({
  page,
  book,
  priority = false,
  fill = false,
}: {
  page: SamplePage;
  book: SampleBook;
  priority?: boolean;
  /** Inside the flip deck StPageFlip sizes the page, so follow it instead. */
  fill?: boolean;
}) {
  return (
    <div
      className={`relative ${
        fill ? "h-full w-full" : "aspect-2/3 w-full"
      } select-none overflow-hidden rounded-2xl border border-border bg-background shadow-2xl`}
    >
      <PageView page={page} book={book} priority={priority} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-linear-to-r from-black/18 via-black/5 to-transparent"
      />
    </div>
  );
}

/* The book pages are an illustration, so their headings are plain paragraphs.
   Putting real headings here would inject the sample copy into the page
   outline that screen readers and search engines walk. */

const PROSE_BASE = "text-[0.575rem] leading-[1.68] text-foreground/80";

/** Justified and hyphenated like print, or ragged right like a designed PDF. */
function prose(book: SampleBook) {
  return book.design.align === "justify"
    ? `${PROSE_BASE} text-justify hyphens-auto`
    : `${PROSE_BASE} text-left`;
}

/* Print indents a continuation paragraph; a ragged-right layout separates them
   with space instead. Mixing the two is what makes a page look unset. */
function paragraphFlow(book: SampleBook) {
  return book.design.align === "justify" ? "[&>p+p]:indent-4" : "space-y-2";
}

const DROP_CAP =
  "first-letter:float-left first-letter:mr-[0.1em] first-letter:text-[1.85rem] first-letter:font-semibold first-letter:leading-[0.8]";

/** "1 · Name the real work" → the figure and the title, for numeral openers. */
function splitNumeral(text: string) {
  const match = /^(\d+)\s*[·.:—-]\s*(.+)$/.exec(text.trim());
  return match ? { numeral: match[1], rest: match[2] } : null;
}

/** "Chapter Two" → a small "Chapter" above a large "Two"; "3" stays "3".
 *  Lets the banner opener print a big figure whatever form the label takes. */
function splitChapterLabel(text: string) {
  const trimmed = text.trim();
  const digits = /^\d+$/.test(trimmed)
    ? trimmed
    : (splitNumeral(trimmed)?.numeral ?? null);
  if (digits) return { lead: null, figure: digits };

  const words = trimmed.split(/\s+/);
  if (words.length < 2) return { lead: null, figure: trimmed };
  return { lead: words.slice(0, -1).join(" "), figure: words[words.length - 1] };
}

/** White type on a pale tint is unreadable — treat light covers as paper pages. */
function isLightTint(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return false;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function Sheet({
  book,
  children,
  className = "",
}: {
  book: SampleBook;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      lang="en"
      className={`flex h-full flex-col bg-[#fdfbf7] ${
        book.typeface === "serif" ? "font-book" : "font-sans"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function RunningHead({ book }: { book: SampleBook }) {
  if (book.design.runningHead === "none") return null;

  // A workbook carries a rule rather than repeating its own title at you.
  if (book.design.runningHead === "rule") {
    return (
      <span
        aria-hidden="true"
        className="block h-0.5 w-8 rounded-full"
        style={{ backgroundColor: book.accent }}
      />
    );
  }

  return (
    <p
      className="border-b pb-2 text-center text-[0.44rem] uppercase tracking-[0.26em]"
      style={{
        color: `${book.accent}99`,
        borderColor: `${book.accent}26`,
      }}
    >
      {book.runningHead}
    </p>
  );
}

/** Space under the running head — none when the book does not print one. */
function headGap(book: SampleBook) {
  return book.design.runningHead === "none" ? "" : "mt-5";
}

/** Accent type set on paper. A pale accent — the honey rate card — washes out
 *  against the sheet, so that book prints the words in its ordinary ink and
 *  keeps the accent for the rule and the tint. No new colour is introduced. */
function accentInk(book: SampleBook) {
  return isLightTint(book.accent) ? undefined : book.accent;
}

/** Readable ink for text sitting on a solid accent band. */
function onAccent(book: SampleBook) {
  return isLightTint(book.accent) ? "text-foreground" : "text-white";
}

/** The chapter opening — the single biggest tell of who typeset a book. */
function ChapterOpener({
  book,
  number,
  heading,
}: {
  book: SampleBook;
  number: string;
  heading: string;
}) {
  if (book.design.chapterOpener === "banner") {
    const { lead, figure } = splitChapterLabel(number);

    return (
      <div>
        {/* Full-bleed band: the Sheet drops its top padding for this opener, so
            the colour runs to all three edges and the title lands on paper. */}
        <div
          className={`-mx-7 px-7 pb-7 pt-8 ${onAccent(book)}`}
          style={{ backgroundColor: book.accent }}
        >
          {lead ? (
            <p className="text-[0.44rem] font-semibold uppercase tracking-[0.3em] opacity-70">
              {lead}
            </p>
          ) : null}
          <p className="mt-1 font-display text-[2.9rem] font-extrabold leading-[0.82] tracking-tight">
            {figure}
          </p>
        </div>

        <p className="mt-6 text-[1.02rem] font-semibold leading-[1.2] tracking-tight">
          {heading}
        </p>
      </div>
    );
  }

  if (book.design.chapterOpener === "block") {
    return (
      <div
        className={`-mx-7 px-7 pb-5 pt-4 ${onAccent(book)}`}
        style={{ backgroundColor: book.accent }}
      >
        <p className="text-[0.44rem] font-bold uppercase tracking-[0.26em] opacity-75">
          {number}
        </p>
        <p className="mt-2 text-[1.02rem] font-extrabold leading-[1.15] tracking-tight">
          {heading}
        </p>
      </div>
    );
  }

  if (book.design.chapterOpener === "numeral") {
    const figure = /^\d+$/.test(number.trim())
      ? number.trim()
      : (splitNumeral(number)?.numeral ?? null);

    return (
      <div>
        {figure ? (
          <p
            className="font-display text-[2.8rem] font-extrabold leading-[0.85] tabular-nums"
            style={{ color: book.accent }}
          >
            {figure}
          </p>
        ) : (
          <p
            className="text-[0.62rem] font-bold uppercase tracking-[0.2em]"
            style={{ color: book.accent }}
          >
            {number}
          </p>
        )}
        <p className="mt-3 text-[1.02rem] font-semibold leading-[1.2] tracking-tight">
          {heading}
        </p>
        <span
          aria-hidden="true"
          className="mt-4 block h-0.5 w-10 rounded-full"
          style={{ backgroundColor: book.accent }}
        />
      </div>
    );
  }

  return (
    <div className="text-center">
      <p
        className="text-[0.46rem] font-semibold uppercase tracking-[0.3em]"
        style={{ color: book.accent }}
      >
        {number}
      </p>
      <p className="mt-3.5 text-[1.02rem] font-semibold leading-[1.2] tracking-tight">
        {heading}
      </p>
      <span
        aria-hidden="true"
        className="mx-auto mt-4 block h-px w-7"
        style={{ backgroundColor: `${book.accent}59` }}
      />
    </div>
  );
}

/** The same identity applied to the smaller headings inside a book. */
function SectionHeading({
  book,
  text,
  size = "text-[0.72rem]",
}: {
  book: SampleBook;
  text: string;
  size?: string;
}) {
  if (book.design.chapterOpener === "block") {
    return (
      <p
        className={`-mx-2 rounded px-2 py-1.5 ${size} font-bold leading-snug tracking-tight ${onAccent(book)}`}
        style={{ backgroundColor: book.accent }}
      >
        {text}
      </p>
    );
  }

  if (book.design.chapterOpener === "numeral") {
    const split = splitNumeral(text);
    if (split) {
      return (
        <p
          className={`flex items-baseline gap-2 ${size} font-semibold leading-snug tracking-tight`}
        >
          <span
            className="font-display text-[1.6rem] font-extrabold leading-none tabular-nums"
            style={{ color: book.accent }}
          >
            {split.numeral}
          </span>
          <span>{split.rest}</span>
        </p>
      );
    }
  }

  return (
    <p className={`${size} font-semibold leading-snug tracking-tight`}>{text}</p>
  );
}

/* `mt-auto` pins the folio to the foot of the sheet and `shrink-0` stops the
   flex column from squeezing it. The content block above it carries `min-h-0`
   + `overflow-hidden`, so long copy is clipped instead of pushing the number
   out of the page. */
function Folio({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-auto shrink-0 pt-3 text-center text-[0.5rem] tabular-nums tracking-[0.2em] text-foreground/35">
      {children}
    </p>
  );
}

function PageView({
  page,
  book,
  priority,
}: {
  page: SamplePage;
  book: SampleBook;
  priority: boolean;
}) {
  if (page.kind === "cover") {
    return (
      <div className="h-full w-full" style={{ backgroundColor: book.tint }}>
        <Image
          src={book.cover}
          alt={`Cover of ${book.title}`}
          fill
          priority={priority}
          sizes="(max-width: 480px) 78vw, 320px"
          className="object-cover"
          draggable={false}
        />
      </div>
    );
  }

  if (page.kind === "art") {
    return (
      <div className="flex h-full flex-col bg-white px-4 pb-4 pt-5">
        <div className="relative flex-1 overflow-hidden">
          <Image
            src={page.image}
            alt={page.caption}
            fill
            sizes="(max-width: 480px) 78vw, 320px"
            className="object-contain"
            draggable={false}
          />
        </div>
        <p
          className="mt-3 shrink-0 text-center text-[0.58rem] italic"
          style={{ color: `${book.accent}80` }}
        >
          {page.caption}
        </p>
        <Folio>{page.folio}</Folio>
      </div>
    );
  }

  if (page.kind === "contents") {
    return (
      <Sheet book={book} className="px-7 py-9">
        <p className="text-center text-[0.95rem] font-semibold tracking-tight">
          {page.heading}
        </p>
        <span
          aria-hidden="true"
          className="mx-auto mt-3 block h-px w-7"
          style={{ backgroundColor: `${book.accent}59` }}
        />

        <ul className="mt-6 min-h-0 overflow-hidden flex-1">
          {page.entries.map((entry) =>
            entry.part ? (
              <li
                key={entry.label}
                className="pb-1.5 pt-3.5 text-[0.44rem] font-semibold uppercase tracking-[0.2em] first:pt-0"
                style={{ color: book.accent }}
              >
                {entry.label}
              </li>
            ) : (
              <li
                key={entry.label}
                className="flex items-baseline gap-1.5 py-[0.16rem] text-[0.56rem] text-foreground/75"
              >
                <span>{entry.label}</span>
                <span
                  aria-hidden="true"
                  className="h-px min-w-3 flex-1 border-b border-dotted border-foreground/25"
                />
                <span className="tabular-nums text-foreground/45">
                  {entry.page}
                </span>
              </li>
            ),
          )}
        </ul>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "chapter") {
    return (
      <Sheet
        book={book}
        className={
          book.design.chapterOpener === "banner"
            ? "px-7 pb-5 pt-0"
            : book.design.chapterOpener === "block"
              ? "px-7 pb-5 pt-7"
              : "px-7 pb-5 pt-12"
        }
      >
        <ChapterOpener
          book={book}
          number={page.number}
          heading={page.heading}
        />

        <div className={`mt-6 min-h-0 flex-1 overflow-hidden ${prose(book)} ${paragraphFlow(book)}`}>
          {page.paragraphs.map((paragraph, position) => (
            <p
              key={paragraph.slice(0, 24)}
              className={
                position === 0 && book.design.dropCap ? DROP_CAP : undefined
              }
            >
              {paragraph}
            </p>
          ))}
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "body") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} min-h-0 flex-1 overflow-hidden`}>
          {page.subheading ? (
            <div className="mb-2.5">
              <SectionHeading book={book} text={page.subheading} />
            </div>
          ) : null}
          <div className={`${prose(book)} ${paragraphFlow(book)}`}>
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "table") {
    return (
      <Sheet book={book} className="px-6 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} min-h-0 flex-1 overflow-hidden`}>
          <SectionHeading
            book={book}
            text={page.heading}
            size="text-[0.78rem]"
          />
          <p className="mt-1.5 text-[0.53rem] leading-[1.6] text-foreground/60">
            {page.intro}
          </p>

          <table className="mt-3.5 w-full border-collapse text-[0.55rem]">
            <thead>
              <tr
                className={onAccent(book)}
                style={{ backgroundColor: book.accent }}
              >
                {page.columns.map((column, position) => (
                  <th
                    key={column}
                    scope="col"
                    className={`px-1.5 py-1 text-[0.44rem] font-semibold uppercase tracking-[0.14em] ${
                      position === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row, line) => (
                <tr
                  key={row[0]}
                  // Zebra rather than rules: a hairline under every row fights
                  // the solid header band and makes the page look like a form.
                  style={
                    line % 2 === 1
                      ? { backgroundColor: `${book.accent}0f` }
                      : undefined
                  }
                >
                  {row.map((cell, position) => (
                    <td
                      key={cell + position}
                      className={`px-1.5 py-[0.3rem] ${
                        position === 0
                          ? "text-left text-foreground/80"
                          : "text-right tabular-nums text-foreground/60"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-[0.5rem] italic leading-[1.55] text-foreground/50">
            {page.footnote}
          </p>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "callout") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} flex min-h-0 flex-1 items-center overflow-hidden`}>
          <aside
            className="w-full py-4 pl-4 pr-4"
            style={{
              backgroundColor: `${book.accent}14`,
              borderLeft: `2px solid ${book.accent}`,
            }}
          >
            <p
              className="text-[0.42rem] font-bold uppercase tracking-[0.26em] text-foreground/45"
            >
              {page.label}
            </p>
            <p
              className="mt-1.5 text-[0.72rem] font-semibold leading-snug tracking-tight"
              style={{ color: accentInk(book) }}
            >
              {page.heading}
            </p>
            <div className={`mt-2.5 ${prose(book)} ${paragraphFlow(book)}`}>
              {page.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </aside>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "quote") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} flex min-h-0 flex-1 flex-col justify-center overflow-hidden`}>
          {/* Sized to sit around half the page — the pause between two runs of
              body text that a book uses to let one idea land. */}
          <blockquote className="min-h-[46%] content-center">
            <p
              className="text-[1.05rem] font-semibold leading-[1.34] tracking-tight"
              style={{ color: accentInk(book) }}
            >
              {page.quote}
            </p>
            <span
              aria-hidden="true"
              className="mt-4 block h-px w-8"
              style={{ backgroundColor: `${book.accent}59` }}
            />
            <p className="mt-3 text-[0.5rem] uppercase tracking-[0.2em] text-foreground/45">
              {page.attribution}
            </p>
          </blockquote>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "definitions") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} min-h-0 flex-1 overflow-hidden`}>
          <SectionHeading
            book={book}
            text={page.heading}
            size="text-[0.78rem]"
          />
          <p className="mt-1.5 text-[0.53rem] leading-[1.6] text-foreground/60">
            {page.intro}
          </p>

          <dl className={`mt-3.5 space-y-2 ${prose(book)}`}>
            {page.items.map((item) => (
              <div key={item.term}>
                <dt
                  className="inline font-semibold"
                  style={{ color: accentInk(book) }}
                >
                  {item.term}:
                </dt>{" "}
                <dd className="ml-0 inline">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "comparison") {
    return (
      <Sheet book={book} className="px-6 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} min-h-0 flex-1 overflow-hidden`}>
          <SectionHeading
            book={book}
            text={page.heading}
            size="text-[0.78rem]"
          />
          <p className="mt-1.5 text-[0.53rem] leading-[1.6] text-foreground/60">
            {page.intro}
          </p>

          <table className="mt-3.5 w-full table-fixed border-collapse text-[0.5rem]">
            <thead>
              <tr
                className={onAccent(book)}
                style={{ backgroundColor: book.accent }}
              >
                {page.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-2 py-1.5 text-left text-[0.44rem] font-semibold uppercase tracking-[0.14em]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((pair, line) => (
                <tr
                  key={pair[0].term}
                  style={
                    line % 2 === 1
                      ? { backgroundColor: `${book.accent}0f` }
                      : undefined
                  }
                >
                  {pair.map((cell, position) => (
                    <td
                      key={cell.term}
                      className={`px-2 py-2 align-top leading-[1.55] text-foreground/70 ${
                        position === 1 ? "border-l border-foreground/10" : ""
                      }`}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: accentInk(book) }}
                      >
                        {cell.term}:
                      </span>{" "}
                      {cell.body}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "statement") {
    const light = isLightTint(book.tint);

    // Full-bleed tint only when the cover colour is dark enough for white type.
    // Light tints get a normal paper page so the copy stays readable.
    if (!light) {
      return (
        <div
          lang="en"
          className="flex h-full flex-col justify-between px-7 pb-6 pt-9 font-sans text-white"
          style={{ backgroundColor: book.tint }}
        >
          <p className="text-[0.46rem] font-bold uppercase tracking-[0.3em] text-white/55">
            {page.label}
          </p>

          <div className="min-h-0 overflow-hidden">
            <p className="text-[0.95rem] font-extrabold leading-[1.32] tracking-tight">
              {page.statement}
            </p>
            <span
              aria-hidden="true"
              className="mt-4 block h-0.5 w-8 rounded-full bg-primary"
            />
            <p className="mt-3.5 text-[0.56rem] leading-[1.6] text-white/70">
              {page.support}
            </p>
          </div>

          <p className="mt-auto shrink-0 pt-3 text-center text-[0.5rem] tabular-nums tracking-[0.2em] text-white/40">
            {page.folio}
          </p>
        </div>
      );
    }

    return (
      <Sheet book={book} className="px-7 pb-5 pt-10">
        <p
          className="text-[0.46rem] font-semibold uppercase tracking-[0.3em]"
          style={{ color: book.accent }}
        >
          {page.label}
        </p>
        <p className="mt-5 text-[0.92rem] font-semibold leading-[1.35] tracking-tight text-foreground">
          {page.statement}
        </p>
        <span
          aria-hidden="true"
          className="mt-4 block h-px w-7"
          style={{ backgroundColor: `${book.accent}59` }}
        />
        <p className={`mt-4 min-h-0 overflow-hidden ${prose(book)}`}>
          {page.support}
        </p>
        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "steps") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead book={book} />

        <div className={`${headGap(book)} min-h-0 flex-1 overflow-hidden`}>
          <SectionHeading
            book={book}
            text={page.heading}
            size="text-[0.8rem]"
          />
          <p className={`mt-2 ${prose(book)}`}>{page.intro}</p>

          <ol className="mt-5">
            {page.steps.map((step, position) => (
              <li
                key={step.title}
                className="border-t border-foreground/10 py-2.5 first:border-t-0 first:pt-0"
              >
                <p
                  className="text-[0.44rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: book.accent }}
                >
                  {String(position + 1).padStart(2, "0")} · {step.window}
                </p>
                <p className="mt-1 text-[0.62rem] font-semibold leading-snug text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-[0.55rem] leading-[1.65] text-foreground/75">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  return (
    <Sheet book={book} className="px-6 pb-5 pt-6">
      <div className="min-h-0 flex-1 overflow-hidden">
        <p
          className="text-[0.44rem] font-bold uppercase tracking-[0.26em]"
          style={{ color: book.accent }}
        >
          {page.label}
        </p>

        <div className="mt-2.5 overflow-hidden rounded-lg border border-foreground/12 bg-white">
          <div
            className="border-b px-3 py-2"
            style={{
              borderColor: `${book.accent}1f`,
              backgroundColor: `${book.accent}0a`,
            }}
          >
            <p className="text-[0.4rem] font-semibold uppercase tracking-[0.18em] text-foreground/40">
              Subject
            </p>
            <p className="mt-0.5 text-[0.6rem] font-bold leading-snug">
              {page.subject}
            </p>
            <p className="mt-1 text-[0.5rem] text-foreground/45">
              {page.preview}
            </p>
          </div>
          <div className="space-y-1.5 px-3 py-2.5">
            {page.body.map((line) => (
              <p
                key={line.slice(0, 24)}
                className="text-[0.53rem] leading-[1.6] text-foreground/75"
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[0.52rem] leading-[1.6] text-foreground/60">
          {page.note}
        </p>

        <p
          className="mt-3.5 text-[0.42rem] font-bold uppercase tracking-[0.2em]"
          style={{ color: book.accent }}
        >
          Swap before sending
        </p>
        <ul className="mt-1.5 space-y-1">
          {page.swaps.map((swap) => (
            <li
              key={swap.field}
              className="flex items-baseline gap-1.5 text-[0.5rem] leading-[1.5]"
            >
              <span
                className="shrink-0 rounded px-1 py-px font-semibold"
                style={{
                  color: book.accent,
                  backgroundColor: `${book.accent}12`,
                }}
              >
                {swap.field}
              </span>
              <span className="text-foreground/55">{swap.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <Folio>{page.folio}</Folio>
    </Sheet>
  );
}
