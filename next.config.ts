import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The PDF export drives a real Chromium. Both packages must stay as they
     are on disk (binaries, __dirname lookups), never bundled. */
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
