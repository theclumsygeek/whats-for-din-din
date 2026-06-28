# Setup & deployment (developer guide)

> Looking for how to *use* the app? See the [README](README.md). This guide covers
> installing, configuring Supabase, and deploying your own copy.

A tiny, phone-friendly PWA that decides **what's for dinner** so you don't have to.
Built for whole-food plant-based (WFPB) cooking and the Well Your World rotation.

- **Frontend:** Vite + React + TypeScript + Tailwind, installable as a PWA
- **Backend:** Supabase (Postgres + email/password auth + Row-Level Security)
- **Hosting:** GitHub Pages (free, public repo)

The recipe data is small, so the app fetches everything once, caches it in
`localStorage` for instant/offline reads, and runs the suggestion engine in the browser.

---

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev                  # http://localhost:5173/whats-for-din-din/
npm run test                 # suggestion-engine unit tests
npm run build                # type-check + production build
```

> The dev URL includes the `/whats-for-din-din/` base path (matches GitHub Pages).

---

## One-time setup

### 1. Supabase (database + auth)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste [`supabase/schema.sql`](supabase/schema.sql) →
   **Run**. (Optionally run [`supabase/seed.sql`](supabase/seed.sql) for sample recipes.)
3. **Authentication → Providers → Email:** make sure Email is enabled, and turn
   **"Allow new users to sign up" OFF** (so only the accounts you create can get in).
4. **Authentication → Users → Add user → Create new user:** create your two accounts,
   each with an email + password and **Auto Confirm User** ticked. (This avoids the
   built-in mailer's low rate limit — no email is sent. Login uses the password.)
5. **Project Settings → API:** copy the **Project URL** and **anon public** key into
   `.env.local` (and into GitHub secrets below). The anon key is safe to expose — RLS
   only lets authenticated users read or write.
6. *(Optional, for local backups)* **Settings → API Keys → create a Secret key**
   (`sb_secret_…`), and add it to `.env.local` as `SUPABASE_SECRET_KEY`. This bypasses
   RLS so `npm run backup` can dump your data — keep it out of git and out of the client
   (it's not `VITE_`-prefixed, so it never ships). See [Backups](#backups) below.

### 2. GitHub Pages (hosting)

1. Push this repo to GitHub (public repo = free Pages).
2. **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. Push to `main` (or run the workflow manually). The
   [deploy workflow](.github/workflows/deploy.yml) tests, builds, and publishes.
5. Your app lives at `https://<you>.github.io/whats-for-din-din/`. Open it on your
   phone and **Add to Home Screen** to install the PWA.

> **Renamed the repo?** The Vite `base` defaults to `/whats-for-din-din/`. Set a
> `BASE_PATH` env var (e.g. `/<new-repo>/`, or `/` for a custom domain) at build time.

---

## How suggestions work

See [`src/lib/suggest.ts`](src/lib/suggest.ts) (pure + unit-tested):

- **Recency weight** — `1 + days since last cooked`, capped; never-cooked recipes get a
  high baseline. Longer-untouched ⇒ more likely to be suggested.
- **Filters** — active only, exclude `avoidBase`, optional `effort`, and **ALL-match**
  ingredients (a recipe must contain *every* selected ingredient).
- **Weighted random draw** — biased toward forgotten favorites, but varied so
  "Surprise me" gives a fresh pick each tap.

Marking **Cooked it** stamps `last_cooked_date`, bumps `times_cooked`, logs the cook,
and rotates the base filter away from what you just made.

---

## Backups

Supabase's free tier has no automated backups, so take your own. With a
`SUPABASE_SECRET_KEY` set in `.env.local` (see step 6 above):

```bash
npm run backup   # writes backups/dindin-<timestamp>.json (recipes + cook_log)
```

The `backups/` folder is git-ignored — the repo is public, so your data must never be
committed. To run it automatically, schedule `npm run backup` (e.g. Windows Task
Scheduler / cron); from there you can sync the JSON to your own private storage.

---

## Deferred / ideas

- Offline **writes** (queued mutations) — today writes need connectivity.
- A **Week** view that generates a 7-night menu, auto-rotating bases.
- A maintained pantry inventory (vs. per-search ingredient filtering).
