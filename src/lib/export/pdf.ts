import "server-only";
import { existsSync } from "fs";
import puppeteer, { type Browser } from "puppeteer-core";
import { issuePrintToken } from "@/lib/export/print-token";

/**
 * BookDocument → PDF, by photographing the pages.
 *
 * The studio's Preview lays the book out as fixed-size sheets in the
 * browser. The PDF must be exactly those sheets, so instead of drawing
 * pages a second time with a PDF library, a headless Chromium opens the
 * print page (`/print/[id]`), which renders the same sheets with the same
 * fonts, and prints them to a 6 × 9 inch PDF. On Vercel the browser is
 * @sparticuz/chromium; on a Mac it is the installed Google Chrome.
 */

const PAGE_WIDTH_IN = 6;
const PAGE_HEIGHT_IN = 9;
/* The print page signals readiness on <html data-print-ready="1"> once the
   layout is measured, the fonts are loaded and the cover has decoded. */
const READY_SELECTOR = "html[data-print-ready='1']";
const READY_TIMEOUT_MS = 45_000;

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function launch(): Promise<Browser> {
  const onVercel = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (onVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      /* The package ships chrome-headless-shell and adds its own
         --headless='shell' flag; asking Puppeteer for "shell" keeps the two
         in agreement. */
      headless: "shell",
    });
  }
  const local = process.env.CHROME_PATH?.trim() || MAC_CHROME;
  if (!existsSync(local)) {
    throw new Error(`No Chrome found for PDF export: set CHROME_PATH (tried ${local})`);
  }
  return puppeteer.launch({ executablePath: local, headless: true, args: ["--no-sandbox"] });
}

/**
 * The PDF of one book, or a thrown error the route turns into a code.
 * `origin` is this deployment's own origin: the print page is fetched from
 * the app itself, with a token that opens that one book for that one user.
 */
export type PdfVariant = "digital" | "print";

/**
 * "digital": the book as sold as a file — cover first, symmetric margins.
 * "print": the interior Amazon KDP prints — no cover (it is uploaded apart),
 * a wider margin on the spine side of every page.
 */
export async function renderPdf(input: {
  origin: string;
  bookId: string;
  userId: string;
  variant?: PdfVariant;
}): Promise<{ file: Buffer; pages: number }> {
  const variant = input.variant ?? "digital";
  const out = await renderPdfs({ ...input, variants: [variant] });
  return out[variant]!;
}

/**
 * Several variants of the same book from one browser: launching Chromium
 * is the slow part, printing a second time is cheap.
 */
export async function renderPdfs(input: {
  origin: string;
  bookId: string;
  userId: string;
  variants: PdfVariant[];
}): Promise<Partial<Record<PdfVariant, { file: Buffer; pages: number }>>> {
  const token = issuePrintToken(input.bookId, input.userId);
  const out: Partial<Record<PdfVariant, { file: Buffer; pages: number }>> = {};

  const browser = await launch();
  try {
    for (const variant of input.variants) {
      const url = `${input.origin}/print/${input.bookId}?t=${encodeURIComponent(token)}&variant=${variant}`;
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
        await page.goto(url, { waitUntil: "networkidle0", timeout: READY_TIMEOUT_MS });
        await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS });
        const pages = await page.evaluate(() => document.querySelectorAll(".print-page").length);
        const pdf = await page.pdf({
          width: `${PAGE_WIDTH_IN}in`,
          height: `${PAGE_HEIGHT_IN}in`,
          printBackground: true,
          preferCSSPageSize: false,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          displayHeaderFooter: false,
        });
        out[variant] = { file: Buffer.from(pdf), pages };
      } finally {
        await page.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

export const PDF_MIME = "application/pdf";

export function pdfFileName(title: string, suffix?: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "book"}${suffix ? `-${suffix}` : ""}.pdf`;
}
