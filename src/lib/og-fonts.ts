import "server-only";

/**
 * Loads a Google font as TTF/OTF/WOFF for Satori (next/og), which cannot read woff2.
 * Fetched once per server instance; on any failure the caller falls back to
 * Satori's default font rather than failing the render.
 */
const cache = new Map<string, Promise<ArrayBuffer | null>>();

export function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weight}&display=swap`,
        // An old user agent makes Google serve plain WOFF/TTF instead of woff2.
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:12.0) Gecko/20100101 Firefox/12.0" } },
      ).then((res) => (res.ok ? res.text() : ""));
      const url = css.match(/src:\s*url\(([^)]+\.(?:ttf|otf|woff))\)/)?.[1];
      if (!url) return null;
      const font = await fetch(url);
      return font.ok ? font.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();

  cache.set(key, promise);
  return promise;
}
