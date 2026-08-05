import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, Source_Serif_4, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Used to typeset the sample book pages, which should read like print.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.tagline} (AI ebook generator)`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "AI ebook generator",
    "create ebook with AI",
    "KDP ebook maker",
    "AI book writer",
    "lead magnet generator",
    "coloring book generator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    url: site.url,
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitter,
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "48x48" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/apple-icon`,
    description: site.description,
    email: site.contactEmail,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site.url}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#d4a017",
        },
      }}
    >
      <html
        lang="en"
        className={`${dmSans.variable} ${spaceGrotesk.variable} ${sourceSerif.variable} h-full`}
      >
        <body className="flex min-h-full flex-col bg-background text-foreground">
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
