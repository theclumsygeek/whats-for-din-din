# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server at http://localhost:5173/whats-for-din-din/
npm run build        # tsc -b (type-check) + vite build -> dist/
npm run test         # vitest run (one-shot)
npm run test:watch   # vitest watch mode
npm run preview      # serve the production build locally
```

Run a single test file or case:

```bash
npx vitest run src/lib/suggest.test.ts          # one file
npx vitest run -t "ALL-match"                    # by test name substring
```

There is **no linter** configured; `tsc` (via `npm run build`) is the type gate. The
dev/preview URLs include the `/whats-for-din-din/` base path — see "GitHub Pages" below.

## Architecture

A phone-first PWA that suggests WFPB dinners, biased toward recipes you haven't cooked
in a while. **All app logic runs in the browser**; Supabase is the only backend.

### Data flow
- **Supabase (Postgres)** is the source of truth: tables `recipes` and `cook_log`
  (schema in `supabase/schema.sql`). Row-Level Security restricts all access to
  authenticated users; the anon key is public by design and safe to ship.
- **`src/lib/supabase.ts`** is the single boundary to the DB: it creates the client,
  handles email/password auth, and maps snake_case rows <-> camelCase app types
  (`toRecipe`/`toRow`). Nothing else imports `@supabase/supabase-js` for data.
- **`src/state/DataProvider.tsx`** is the one stateful store (React context, `useData()`
  hook). On mount it shows `localStorage`-cached data instantly, then revalidates from
  Supabase (stale-while-revalidate via `src/lib/cache.ts`). **Every mutation calls the
  supabase helper then `refresh()`** — there is no optimistic update; re-read is the
  source of truth. Add new data operations as a helper in `supabase.ts` + an action in
  `DataProvider`, not ad hoc in components.

### The suggestion engine — `src/lib/suggest.ts`
The heart of the app, kept **pure and dependency-free** so it's unit-tested in isolation
(`suggest.test.ts`). Key points:
- `recipeWeight` = `1 + days since last cooked` (capped at `MAX_DAYS`); never-cooked
  recipes get the `BASE_NEW` baseline. Longer-untouched ⇒ higher weight ⇒ more likely.
- `suggest()` filters then draws a **weighted-random** ranked list (Efraimidis–Spirakis
  via `weightedShuffle`). Inject `rng`/`now` for determinism — a constant `rng` degrades
  it to a deterministic sort by weight, which the tests rely on.
- Ingredient filtering is **strict ALL-match** (recipe must contain every selected
  ingredient). Grain rotation is a hard exclude of `avoidGrain`.
- When changing weighting/filtering, update `suggest.test.ts` accordingly.

### UI
- Two screens under `src/screens/` (`Tonight`, `Recipes`) switched by **tab state in
  `App.tsx`** — intentionally **no router** so GitHub Pages needs no SPA-routing
  fallback. Don't add react-router without revisiting the Pages deploy.
- `AuthGate` wraps everything: shows a setup hint if env vars are missing, an
  email/password sign-in if logged out, otherwise the app. Accounts are created by the
  owner in the Supabase dashboard (public sign-up is disabled), so there's no sign-up UI.
- Styling is Tailwind with reusable component classes (`.card`, `.btn-primary`,
  `.chip-on/.chip-off`, `.field`) defined in `src/index.css`; brand palette
  (`brand`/`earth`/`ink`) and `darkMode: 'class'` in `tailwind.config.js`. Dark mode is
  toggled by adding `dark` to `<html>` (`applyTheme` in `cache.ts`). Prefer these
  classes/tokens over ad-hoc colors to keep the wellyourworld.com look consistent.

## Environment & deploy

- Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (copy `.env.example` to
  `.env.local`). Without them the app renders a "setup needed" screen instead of crashing.
- **GitHub Pages** hosts the static build via `.github/workflows/deploy.yml` (tests +
  builds on push to `main`); the two env vars come from repo Actions secrets.
- Vite `base` defaults to `/whats-for-din-din/`; if the repo is renamed, set `BASE_PATH`
  at build time (`/` for a custom domain). The PWA manifest `start_url`/`scope` derive
  from this base, so keep them aligned.

See `README.md` for the full Supabase + Pages one-time setup.
