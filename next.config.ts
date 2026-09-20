import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/* Who the browser is allowed to talk to, and why. Anything not listed is
   refused by the CSP below.
   - Clerk: its frontend API (the *.clerk.accounts.dev instance in dev and
     test, clerk.<our domain> in production), its avatars, telemetry, the
     bot-protection hosts and the Cloudflare challenge on sign-up.
   - Supabase: the signed URLs of covers and coloring pages (images only;
     the browser never holds a Supabase client).
   - Vercel: the analytics script and its beacon; vercel.live only exists on
     preview deployments.
   - Stripe: nothing. Checkout and the billing portal are full-page
     redirects to stripe.com, so no Stripe script or frame runs here. */
const clerk = [
  "https://*.clerk.accounts.dev",
  "https://clerk.ebookstudioai.com",
  "https://*.clerk.com",
  "https://*.protect.clerk.com",
];

const csp = [
  "default-src 'self'",
  /* 'unsafe-inline' stays: Next's own hydration scripts and Clerk's inline
     bootstrap are not nonce-aware without moving header emission into the
     proxy. 'unsafe-eval' is a development-only need of React's devtools. */
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${clerk.join(" ")} https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live`,
  `connect-src 'self' ${clerk.join(" ")} https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.supabase.co https://vitals.vercel-insights.com https://vercel.live${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "img-src 'self' blob: data: https://img.clerk.com https://*.supabase.co",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `frame-src ${clerk.join(" ")} https://challenges.cloudflare.com https://vercel.live`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/* Report-Only first: violations show in the browser console and block
   nothing. It becomes Content-Security-Policy once login, the studio and
   the checkout have been walked through with a clean console. */
const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
