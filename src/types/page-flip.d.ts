/* page-flip 2.0.7 ships no type declarations, so this describes the parts of
   StPageFlip we actually use. See node_modules/page-flip/dist/js for the
   implementation these signatures were read from. */
declare module "page-flip" {
  export type PageFlipOrientation = "portrait" | "landscape";
  export type PageFlipCorner = "top" | "bottom";
  export type PageFlipState = "user_fold" | "fold_corner" | "flipping" | "read";

  export type PageFlipSettings = {
    startPage: number;
    size: "fixed" | "stretch";
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    startZIndex: number;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    swipeDistance: number;
    clickEventForward: boolean;
    useMouseEvents: boolean;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
  };

  export type PageFlipEvent<T> = { data: T; object: PageFlip };

  /** Internal render loop. Exposed only so teardown can silence it. */
  export type PageFlipRender = {
    render: (timer: number) => void;
    update: () => void;
  };

  /** Internal page list. Exposed only so teardown can release the elements. */
  export type PageFlipPageCollection = {
    destroy: () => void;
  };

  /** A loaded page. Exposed so the deck can override the density StPageFlip
      assigns to the cover and to a trailing odd page. */
  export type PageFlipPage = {
    setDensity: (density: "soft" | "hard") => void;
    setDrawingDensity: (density: "soft" | "hard") => void;
  };

  export class PageFlip {
    constructor(element: HTMLElement, settings: Partial<PageFlipSettings>);

    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    update(): void;
    clear(): void;
    destroy(): void;

    on(event: "flip", handler: (e: PageFlipEvent<number>) => void): PageFlip;
    on(
      event: "changeState",
      handler: (e: PageFlipEvent<PageFlipState>) => void,
    ): PageFlip;
    on(
      event: "changeOrientation",
      handler: (e: PageFlipEvent<PageFlipOrientation>) => void,
    ): PageFlip;
    on(
      event: "init",
      handler: (
        e: PageFlipEvent<{ page: number; mode: PageFlipOrientation }>,
      ) => void,
    ): PageFlip;
    off(event: string): void;

    flipNext(corner?: PageFlipCorner): void;
    flipPrev(corner?: PageFlipCorner): void;
    flip(page: number, corner?: PageFlipCorner): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;

    getCurrentPageIndex(): number;
    getPageCount(): number;
    getPage(page: number): PageFlipPage;
    getOrientation(): PageFlipOrientation;
    getRender(): PageFlipRender;
    getPageCollection(): PageFlipPageCollection;
  }
}
