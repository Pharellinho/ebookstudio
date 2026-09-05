import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BookCover } from "@/components/app/book-cover";
import { resolveTheme } from "@/lib/book-design";
import { getBookForUser } from "@/lib/books";
import { COVER_HEIGHT, COVER_WIDTH, isCoverLayout } from "@/lib/cover-layouts";
import { downloadCoverArt } from "@/lib/covers";
import { loadGoogleFont } from "@/lib/og-fonts";

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/**
 * GET → the cover as a PNG at KDP's ideal 1,600 × 2,560 (ratio 1.6:1),
 * rendered from the same BookCover component the studio shows. This is the
 * file the export will pick up (KDP wants JPEG on upload; the export step
 * converts). Owner only: the cover carries the book title.
 */
export async function GET(request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await getBookForUser(id, userId);
  if (!book) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("layout");
  const layout = isCoverLayout(requested)
    ? requested
    : isCoverLayout(book.cover_layout)
      ? book.cover_layout
      : "centered";

  /* The illustration goes in as a data URL: the bucket is private and the
     renderer must not depend on a signed URL still being valid. */
  let artUrl: string | null = null;
  if (book.cover_art_url && layout !== "type") {
    const bytes = await downloadCoverArt(book.cover_art_url);
    if (bytes) artUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  }

  const { theme } = resolveTheme(book.format_slug, book.theme, book.id);
  const [display, text] = await Promise.all([
    loadGoogleFont("Space Grotesk", 700),
    loadGoogleFont("DM Sans", 600),
  ]);
  const fonts = [
    display ? { name: "Space Grotesk", data: display, weight: 700 as const, style: "normal" as const } : null,
    text ? { name: "DM Sans", data: text, weight: 600 as const, style: "normal" as const } : null,
  ].filter((font): font is NonNullable<typeof font> => font !== null);

  return new ImageResponse(
    (
      <BookCover
        artUrl={artUrl}
        title={book.title ?? book.outline?.title ?? "Untitled"}
        subtitle={book.subtitle}
        author={book.cover_author}
        accent={theme.accent}
        layout={layout}
        displayFont={display ? "Space Grotesk" : "sans-serif"}
        textFont={text ? "DM Sans" : "sans-serif"}
        width={COVER_WIDTH}
        height={COVER_HEIGHT}
      />
    ),
    {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      // An empty `fonts` array disables Satori's built-in font; only pass
      // ours when at least one actually loaded.
      ...(fonts.length > 0 ? { fonts } : {}),
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
