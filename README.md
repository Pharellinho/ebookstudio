# EbookStudio

AI ebook studio: one idea in, a store-ready book out. Marketing site and product shell for `ebookstudioai.com`.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `src/app/globals.css` |
| Icons | lucide-react |
| Planned: data + auth | Supabase |
| Planned: generation | OpenAI |
| Planned: payments | Stripe |

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs on http://localhost:3000.

## Project structure

```
src/
  app/                 Routes (App Router)
    page.tsx           Landing page
    pricing/           Plans, credit table, FAQ
    ebook-types/       Format index + one page per format
    for-authors/       Use-case landing
    for-course-creators/
    tools/             Free calculators (SEO link magnets)
    blog/              Article index + posts
    create/            Entry point for the generation pipeline (stub)
    sitemap.ts         Generated sitemap.xml
    robots.ts          Generated robots.txt
  components/          UI and page sections
  lib/
    site.ts            Site name, URL, navigation
    content.ts         Formats, features, pricing, FAQ copy
    posts.ts           Blog content
design-system/         Generated design system reference (ui-ux-pro-max)
```

## Design system

Colors, typography and component specs live in `design-system/ebookstudio/MASTER.md`, generated with the `ui-ux-pro-max` skill. The tokens are implemented as CSS variables in `src/app/globals.css`; change them there rather than hardcoding hex values in components.

## SEO

- Metadata is set per page with `alternates.canonical`; the title template lives in `src/app/layout.tsx`.
- JSON-LD: `Organization` and `WebSite` in the root layout, `FAQPage` on the homepage, `Product` on pricing, `BlogPosting` on articles.
- `sitemap.xml` and `robots.txt` are generated from `src/lib/content.ts` and `src/lib/posts.ts`, so new formats and posts are picked up automatically.
- Set `NEXT_PUBLIC_SITE_URL` in production so canonical URLs and the sitemap point at the real domain.

## Waitlist (pre-launch mode)

The homepage runs in pre-launch mode until the date in `launch` (`src/lib/site.ts`). Offer numbers, spot count and referral rewards live in `founder` in the same file, so the whole page can be retuned from one place.

- Signups go to `POST /api/waitlist`, handled by `src/lib/waitlist.ts`.
- Without Supabase credentials the list is written to `.data/waitlist.json`. That is fine locally but **not** on a serverless host, where each instance has its own filesystem: apply `supabase/migrations/0001_waitlist.sql` and point the storage functions at Supabase before deploying.
- Positions are derived from insertion order, minus `referralJump` places per confirmed referral.
- `/welcome?code=…` shows position, bonus credits and the invite link. It is `noindex`.
- Confirmation emails are not sent yet; wire Resend once the domain is verified.

## Before launch

- Move waitlist storage from the JSON file to Supabase (see above). This is the one blocker for deploying.
- Send the confirmation email through Resend and add an unsubscribe link.
- Replace the placeholder testimonials in `src/lib/content.ts` with real, attributable quotes.
- Have the privacy policy and terms reviewed by a lawyer; the current text is a placeholder.
- Add a real Open Graph image (`src/app/opengraph-image.tsx` or a static file).
- Verify the domain in Google Search Console and submit the sitemap.

## Roadmap

1. Landing and SEO pages (done)
2. Supabase auth and project persistence
3. Generation pipeline: brief → outline → chapters → cover
4. Live preview and chapter editing
5. PDF, EPUB and DOCX export
6. Stripe subscriptions and the credit ledger
