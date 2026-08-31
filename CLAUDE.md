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

## State of the repo (as of 30 Aug 2026)

`main` is at `8b838b9`. Production still runs the **old marketing/waitlist structure**.
There is a large uncommitted WIP (~32 files) introducing the route groups and the whole
signed-in app. It typechecks clean but has **not** been build-verified or deployed.

Known issues in the WIP, in priority order:

1. `/api/books/[id]/generate` has no `export const maxDuration` — the SSE stream will
   be cut off by Vercel before a book finishes. Works in dev, fails in production.
2. Same route: a dead stream leaves the book stuck in status `writing`, and the
   `already_generating` guard then returns 409 forever. No staleness recovery.
3. Same route: `checkRateLimit` runs before the status check, so a stuck book burns
   the user's 6 attempts/hour on 409s.
4. `POST /api/books` accepts a client-supplied `outline` validated only by
   `typeof === "object"`. A 500-chapter outline means 500 OpenAI calls in one request.
5. `replaceOutlineChapters` deletes all chapters before reinserting — a retry
   re-bills chapters that were already generated successfully.
6. `scribe-flow.tsx` streams without an `AbortController`; navigating away strands
   the book in `writing` (feeds issue 2).

Dead code to remove before committing: `src/components/create-wizard.tsx` (393 lines,
imported nowhere). Empty leftover dirs: `src/app/(marketing)/preview/`.

## Verifying work

Before telling Pharell something is done:

```bash
npm run build          # must pass
npm run dev            # then check the actual page in the browser
```

For anything touching `(marketing)`, confirm `/`, `/pricing`, `/ebook-types`,
`/sitemap.xml` and `/robots.txt` still render.
