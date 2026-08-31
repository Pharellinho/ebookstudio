@AGENTS.md

# EbookStudio — working agreement

## Who you are working with

Pharell is the founder and sole operator of this project. He is **not a programmer**.
He reads French; the product UI is English. Adjust accordingly:

- Explain what you changed in plain language, in French, before showing code.
- Never assume he can spot a bug by reading a diff. If a change is risky, say so
  explicitly and tell him exactly what to click to verify it works.
- When he describes a problem in vague terms, ask for the symptom he sees on screen,
  not for stack traces.

## Hard rules

1. **Never commit or push without being asked.** Not "I'll commit this for you" —
   ask, wait for a yes.
2. **Never touch `.env.local`** or print secrets to the terminal.
3. **Never run destructive git commands** (`reset --hard`, `checkout .`, `clean -fd`,
   force push). There is a large uncommitted WIP in this repo; losing it is
   unrecoverable.
4. **Run `npm run build` before saying a change works.** `npx tsc --noEmit` is not
   enough — several classes of error only appear at build time.
5. **No fake reviews, ratings, or testimonial schema.** Ever.
6. **Read the existing code before rewriting it.** Targeted changes only. No large
   refactors unless explicitly asked.

## Project

- **Product**: EbookStudio — https://www.ebookstudioai.com (apex 308-redirects to www)
- **Repo**: github.com/Pharellinho/ebookstudio
- **Stack**: Next.js 16.3 App Router, TypeScript, Tailwind v4, Supabase (DB only,
  service-role access), Clerk (auth), Resend (email), OpenAI, deployed on Vercel
- **Launch pricing**: founding $19/mo (first 100) vs $29 public

> Next.js 16 is not the Next.js in your training data. Read the relevant guide in
> `node_modules/next/dist/docs/` before writing routing, caching, or metadata code.
> Note: `middleware` is called `proxy` in 16 — `src/middleware.ts` still works via
> Clerk, do not "fix" it unprompted.

## Structure

```
src/app/(marketing)/   public pages — indexed by Google, be careful here
src/app/(app)/         signed-in app — dashboard, books, create, studio, account, coloring
src/app/api/           route handlers
src/lib/generation/    OpenAI prompts + streaming pipeline
src/lib/books.ts       all Supabase reads/writes for books & chapters
src/lib/auth/          Clerk → Supabase profile sync
src/components/app/    app-shell components (sidebar, scribe-flow, studio-reader)
```

`src/app/(marketing)` is live in production and indexed. Breaking a page there costs
SEO ranking that took weeks to earn. Treat it as more fragile than the app.

## Design system

Honey/ochre on white — warm, editorial, deliberately **not** the purple/violet "AI
startup" cliché. Tokens live in `src/app/globals.css`:

- `--color-primary: #d4a017` (honey ochre), `--color-primary-strong: #b8860b`
- `--color-surface-warm: #faf6ef`, black foreground, black rings

Use the tokens, never hardcode hex values in components. Do not introduce new accent
colors without asking.

## Positioning

We sell **income, not software**. The angle is "this becomes an asset that earns",
not "an AI ebook generator". Current tagline: *Create once, get paid forever*.
Any marketing copy you write must hold that line. Competitor reference is getebook.ai
for UX only — never copy their visual identity.

## State of the repo (as of 31 Aug 2026)

`main` is at `8b838b9`. Production still runs the **old marketing/waitlist structure**,
so www.ebookstudioai.com does *not* show the new landing.

The former uncommitted WIP now lives on the branch **`landing-live`**, pushed to
GitHub: the route groups, the signed-in app, the generation pipeline and the
relaunched landing. It builds clean. Nothing is merged into `main` yet.

The six issues listed here previously are fixed on that branch:

1. `/api/books/[id]/generate` now sets `export const maxDuration = 300`, which lands
   in `functions-config-manifest.json` and is what Vercel reads. **If a deploy is
   rejected for exceeding the plan limit, lower this number** — 60 is always allowed.
2. Same route: a book whose `updated_at` has not moved for 5 minutes is treated as
   stalled rather than busy, so a dead stream no longer locks it behind a permanent
   409. `touchBook` beats once per finished chapter to keep that check honest.
3. Same route: `checkRateLimit` now runs *after* the ownership and status checks, so
   a 409 never costs one of the 6 attempts per hour.
4. `POST /api/books` validates the client-supplied outline with `parseOutline`:
   bounded title, subtitle and summary lengths, and 1 to `MAX_OUTLINE_CHAPTERS`
   chapters. `generateOutline` caps the model's own output at the same ceiling.
5. `replaceOutlineChapters` is now `syncOutlineChapters`: chapters that already hold
   finished text survive a retry, and the route replays them instead of buying the
   same chapter from OpenAI twice.
6. `scribe-flow.tsx` holds an `AbortController` and aborts on unmount, so leaving the
   page ends the request instead of stranding the book in `writing`.

Still open: `src/components/create-wizard.tsx` (393 lines, imported nowhere) is
committed rather than deleted — it was never in git, so removing it unasked would
have destroyed it. Empty leftover dir: `src/app/(marketing)/preview/`.

## Verifying work

Before telling Pharell something is done:

```bash
npm run build          # must pass
npm run dev            # then check the actual page in the browser
```

For anything touching `(marketing)`, confirm `/`, `/pricing`, `/ebook-types`,
`/sitemap.xml` and `/robots.txt` still render.
