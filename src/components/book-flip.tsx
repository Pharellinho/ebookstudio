"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

/** How far the corner lifts when the pointer rests over an edge. */
const PEEK = 0.07;
/** Fraction of a drag past which releasing completes the turn. */
const COMMIT_AT = 0.32;

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

type Phase = "peek" | "drag" | "settle";

type Turn = {
  to: number;
  direction: 1 | -1;
  /** 0 is flat on the book, 1 is fully turned. */
  progress: number;
  phase: Phase;
  /** Where the current animation is headed, or the live progress while dragging. */
  target: number;
  completing: boolean;
};

function BookFlip({
  book,
  interactive,
  onInteract,
}: {
  book: SampleBook;
  interactive: boolean;
  onInteract: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  /* Mirrors turn so the animation loop and pointer handlers read the live value
     instead of whatever the closure captured when they were created. */
  const turnRef = useRef<Turn | null>(null);
  const frame = useRef<number | null>(null);
  const watchdog = useRef<number | null>(null);
  const drag = useRef<{
    startX: number;
    width: number;
    direction: 1 | -1;
    moved: boolean;
  } | null>(null);
  const pointerKind = useRef<string>("mouse");
  const total = book.pages.length;

  // Coming back to a book should feel like picking it up again, not resuming.
  useEffect(() => {
    if (interactive) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (watchdog.current !== null) clearTimeout(watchdog.current);
    watchdog.current = null;
    turnRef.current = null;
    drag.current = null;
    setIndex(0);
    setTurn(null);
  }, [interactive]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (watchdog.current !== null) clearTimeout(watchdog.current);
    },
    [],
  );

  function destination(direction: 1 | -1) {
    const to = index + direction;
    return to >= 0 && to < total ? to : null;
  }

  function edgeAt(clientX: number, rect: DOMRect): 1 | -1 | 0 {
    const ratio = (clientX - rect.left) / rect.width;
    if (ratio > 0.6) return 1;
    if (ratio < 0.32) return -1;
    return 0;
  }

  function write(next: Turn | null) {
    turnRef.current = next;
    setTurn(next);
  }

  function stopLoop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (watchdog.current !== null) clearTimeout(watchdog.current);
    watchdog.current = null;
  }

  /* The leaf is interpolated by hand rather than handed to a CSS transition.
     A transform applied on the frame the leaf mounts produces no transition at
     all, and a missed transitionend would strand the page mid-turn forever. */
  function drive(
    from: Turn,
    target: number,
    durationMs: number,
    done?: () => void,
  ) {
    stopLoop();
    const start = performance.now();
    const origin = from.progress;
    write({ ...from, target });

    if (Math.abs(target - origin) < 0.001) {
      write({ ...from, progress: target, target });
      done?.();
      return;
    }

    const finish = () => {
      stopLoop();
      const current = turnRef.current;
      if (current) write({ ...current, progress: target, target });
      done?.();
    };

    const step = (now: number) => {
      const elapsed = Math.min((now - start) / durationMs, 1);
      const current = turnRef.current;
      if (!current) {
        frame.current = null;
        return;
      }

      if (elapsed >= 1) {
        finish();
        return;
      }

      const eased = 1 - Math.pow(1 - elapsed, 3);
      write({ ...current, progress: origin + (target - origin) * eased });
      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    // Frames stop in background tabs, and a page stranded mid-turn would block
    // every later turn, so the outcome never depends on the loop running.
    watchdog.current = window.setTimeout(finish, durationMs + 120);
  }

  /** Progress to start from, so a lifted corner is never dropped first. */
  function carriedProgress(direction: 1 | -1) {
    const current = turnRef.current;
    return current && current.direction === direction ? current.progress : 0;
  }

  function beginPeek(direction: 1 | -1) {
    const to = destination(direction);
    if (to === null) return;
    drive(
      {
        to,
        direction,
        progress: carriedProgress(direction),
        phase: "peek",
        target: PEEK,
        completing: false,
      },
      PEEK,
      200,
    );
  }

  function releasePeek() {
    const current = turnRef.current;
    if (!current || current.phase !== "peek") return;
    drive(current, 0, 180, () => write(null));
  }

  function complete(direction: 1 | -1, durationMs: number) {
    const to = destination(direction);
    if (to === null) return;
    onInteract();

    drive(
      {
        to,
        direction,
        progress: carriedProgress(direction),
        phase: "settle",
        target: 1,
        completing: true,
      },
      1,
      durationMs,
      () => {
        setIndex(to);
        write(null);
      },
    );
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    if (drag.current) {
      const { startX, width, direction } = drag.current;
      const travelled =
        direction === 1 ? startX - event.clientX : event.clientX - startX;
      if (Math.abs(event.clientX - startX) > 6) drag.current.moved = true;

      const progress = Math.min(Math.max(travelled / (width * 0.8), 0), 1);
      const current = turnRef.current;
      if (current) write({ ...current, progress, target: progress });
      return;
    }

    if (!interactive) return;
    if (event.pointerType === "touch") return;
    if (turn?.completing) return;

    const edge = edgeAt(event.clientX, rect);

    if (edge === 0 || destination(edge) === null) {
      releasePeek();
      return;
    }

    // Already lifting this edge, so leave the animation alone.
    if (turn?.phase === "peek" && turn.direction === edge && turn.target === PEEK) {
      return;
    }
    beginPeek(edge);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerKind.current = event.pointerType;
    if (!interactive || turn?.completing) return;
    // Touch keeps its native meaning so the carousel can still be swiped.
    if (event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const direction = edgeAt(event.clientX, rect) === -1 ? -1 : 1;
    const to = destination(direction);
    if (to === null) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      startX: event.clientX,
      width: rect.width,
      direction,
      moved: false,
    };

    stopLoop();
    const progress = carriedProgress(direction);
    write({
      to,
      direction,
      progress,
      phase: "drag",
      target: progress,
      completing: false,
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture) return;
    drag.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const current = turnRef.current;
    const progress = current?.progress ?? 0;

    // A press that never moved is a click, and clicking turns the page.
    if (!gesture.moved) {
      complete(gesture.direction, 560);
      return;
    }

    if (progress > COMMIT_AT) {
      complete(gesture.direction, Math.round(240 + (1 - progress) * 260));
      return;
    }

    if (current) {
      drive({ ...current, phase: "settle" }, 0, 320, () => write(null));
    }
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (pointerKind.current !== "touch" || !interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    complete(edgeAt(event.clientX, rect) === -1 ? -1 : 1, 560);
  }

  const beneath = turn ? turn.to : index;
  const angle = turn
    ? (turn.direction === 1 ? -180 : 180) * turn.progress
    : 0;
  const shade = turn ? Math.sin(turn.progress * Math.PI) * 0.5 : 0;
  /* Strongest just after the lift and gone by the time the leaf lies flat, which
     is what sells the corner as being held off the page. */
  const lift = turn ? Math.min(turn.progress * 12, 1) * (1 - turn.progress) : 0;
  /* A touch of roll on top of the swing, so the free corner rises further than
     the rest of the sheet instead of the page pivoting like a door. */
  const roll = turn ? (turn.direction === 1 ? -1 : 1) * 2.6 * lift : 0;

  return (
    <figure className="flex flex-col items-center">
      <div
        className="relative w-full [perspective:1800px]"
        role="group"
        aria-roledescription="book preview"
        aria-label={`${book.title}, page ${index + 1} of ${total}`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={releasePeek}
        onClick={handleClick}
        style={{
          cursor:
            !interactive || !turn
              ? undefined
              : turn.phase === "drag"
                ? "grabbing"
                : "grab",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 bottom-0 h-8 translate-y-3 rounded-[50%] bg-foreground/20 blur-lg"
        />

        <PageCard
          page={book.pages[beneath]}
          book={book}
          priority={interactive}
        />

        {turn === null ? null : (
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{
              transform: `rotateY(${angle}deg) rotateZ(${roll.toFixed(2)}deg)`,
              transformOrigin:
                turn.direction === 1 ? "left center" : "right center",
              boxShadow: `${turn.direction === 1 ? "-" : ""}${(
                lift * 26
              ).toFixed(1)}px 0 ${(lift * 34).toFixed(
                1,
              )}px rgba(0,0,0,${(lift * 0.32).toFixed(3)})`,
            }}
          >
            <PageCard page={book.pages[index]} book={book} />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-2xl ${
                turn.direction === 1
                  ? "bg-linear-to-l from-black to-transparent"
                  : "bg-linear-to-r from-black to-transparent"
              }`}
              style={{ opacity: shade }}
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <CarouselButton
          label="Previous page"
          disabled={!interactive || index === 0}
          onClick={() => complete(-1, 560)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </CarouselButton>
        <span className="min-w-16 text-center text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} of {total}
        </span>
        <CarouselButton
          label="Next page"
          disabled={!interactive || index === total - 1}
          onClick={() => complete(1, 560)}
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
}: {
  page: SamplePage;
  book: SampleBook;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-2/3 w-full select-none overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
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

const PROSE =
  "text-[0.575rem] leading-[1.68] text-foreground/80 text-justify hyphens-auto";

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

function RunningHead({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <p
      className="border-b pb-2 text-center text-[0.44rem] uppercase tracking-[0.26em]"
      style={{
        color: accent ? `${accent}99` : undefined,
        borderColor: accent ? `${accent}26` : undefined,
      }}
    >
      {children}
    </p>
  );
}

function Folio({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-3 text-center text-[0.5rem] tabular-nums tracking-[0.2em] text-foreground/35">
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
          className="mt-3 text-center text-[0.58rem] italic"
          style={{ color: `${book.accent}80` }}
        >
          {page.caption}
        </p>
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

        <ul className="mt-6 flex-1">
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
      </Sheet>
    );
  }

  if (page.kind === "chapter") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-12">
        <div className="text-center">
          <p
            className="text-[0.46rem] font-semibold uppercase tracking-[0.3em]"
            style={{ color: book.accent }}
          >
            {page.number}
          </p>
          <p className="mt-3.5 text-[1.02rem] font-semibold leading-[1.2] tracking-tight">
            {page.heading}
          </p>
          <span
            aria-hidden="true"
            className="mx-auto mt-4 block h-px w-7"
            style={{ backgroundColor: `${book.accent}59` }}
          />
        </div>

        <div className={`mt-6 flex-1 ${PROSE} [&>p+p]:indent-4`}>
          {page.paragraphs.map((paragraph, position) => (
            <p
              key={paragraph.slice(0, 24)}
              className={
                position === 0
                  ? "first-letter:float-left first-letter:mr-[0.1em] first-letter:text-[1.85rem] first-letter:font-semibold first-letter:leading-[0.8]"
                  : undefined
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
        <RunningHead accent={book.accent}>{book.runningHead}</RunningHead>

        <div className="mt-5 flex-1">
          {page.subheading ? (
            <p className="mb-2.5 text-[0.72rem] font-semibold leading-snug tracking-tight">
              {page.subheading}
            </p>
          ) : null}
          <div className={`${PROSE} [&>p+p]:indent-4`}>
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
        <RunningHead accent={book.accent}>{book.runningHead}</RunningHead>

        <div className="mt-5 flex-1">
          <p className="text-[0.78rem] font-semibold leading-snug tracking-tight">
            {page.heading}
          </p>
          <p className="mt-1.5 text-[0.53rem] leading-[1.6] text-foreground/60">
            {page.intro}
          </p>

          <table className="mt-3.5 w-full border-collapse text-[0.55rem]">
            <thead>
              <tr>
                {page.columns.map((column, position) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b pb-1 text-[0.44rem] font-semibold uppercase tracking-[0.14em] ${
                      position === 0 ? "text-left" : "text-right"
                    }`}
                    style={{
                      color: book.accent,
                      borderColor: `${book.accent}40`,
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row[0]} className="border-b border-foreground/8">
                  {row.map((cell, position) => (
                    <td
                      key={cell + position}
                      className={`py-[0.28rem] ${
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

          <div>
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

          <p className="text-center text-[0.5rem] tabular-nums tracking-[0.2em] text-white/40">
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
        <p className={`mt-4 ${PROSE}`}>{page.support}</p>
        <Folio>{page.folio}</Folio>
      </Sheet>
    );
  }

  if (page.kind === "steps") {
    return (
      <Sheet book={book} className="px-7 pb-5 pt-6">
        <RunningHead accent={book.accent}>{book.runningHead}</RunningHead>

        <div className="mt-5 flex-1">
          <p className="text-[0.8rem] font-semibold leading-snug tracking-tight">
            {page.heading}
          </p>
          <p className={`mt-2 ${PROSE}`}>{page.intro}</p>

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
      <div className="flex-1">
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
