const domain = "ebookstudioai.com";

function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const isLocal =
    !configured || /localhost|127\.0\.0\.1/i.test(configured);

  if (configured && !isLocal) return configured;

  // Never put localhost into production emails / OG / canonicals.
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return `https://${domain}`;
  }

  return configured || "http://localhost:3000";
}

export const site = {
  name: "EbookStudio",
  domain,
  url: resolveSiteUrl(),
  tagline: "Create once, get paid forever",
  description:
    "EbookStudio turns one idea into a full manuscript, a designed cover and store-ready PDF, EPUB and DOCX files. Join the waitlist before launch to lock the founding price.",
  twitter: "@ebookstudioai",
  contactEmail: "ebook.studiai@gmail.com",
} as const;

export const launch = {
  /** Public launch moment the countdown runs to. */
  date: "2026-08-15T09:00:00+02:00",
  /** Shown as the human-readable date across the page. */
  label: "15 August 2026",
} as const;

export const founder = {
  spots: 100,
  monthlyPrice: 19,
  monthlyCredits: 500,
  bonusCredits: 300,
  reservationPrice: 9,
  launchPrice: 29,
  launchCredits: 300,
  /** Credits granted per confirmed referral. */
  referralCredits: 50,
  /** Positions gained per confirmed referral. */
  referralJump: 10,
  /** Referrals needed for a free founding spot. */
  referralsForFreeSpot: 10,
} as const;

export const nav = {
  product: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Ebook types", href: "/ebook-types" },
    { label: "Founding offer", href: "/#founding-offer" },
  ],
  useCases: [
    { label: "For self-publishing authors", href: "/for-authors" },
    { label: "For course creators", href: "/for-course-creators" },
  ],
  resources: [
    { label: "Free tools for authors", href: "/tools" },
    { label: "Blog", href: "/blog" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
