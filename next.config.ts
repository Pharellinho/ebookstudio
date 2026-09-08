import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The PDF export drives a real Chromium. Both packages must stay as they
     are on disk (binaries, __dirname lookups), never bundled. */
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  /* Chromium's compressed binaries are read from disk at runtime; the file
     tracer cannot see that, so the export function is told to ship them. */
  outputFileTracingIncludes: {
    // A glob, not a path: square brackets would be read as a character class.
    "/api/books/*/export/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
