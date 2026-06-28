# Plan: Integrate the unused `timesCooked` and `cook_log` data

Status: proposal / not yet implemented. Implement on desktop at your own pace.

## Background — what's currently dormant

Two pieces of data are written/stored but barely (or never) consumed:

1. **`timesCooked`** — incremented on every "Cooked it" (`src/lib/supabase.ts:158`),
   read back into the `Recipe` model (`src/lib/supabase.ts:50`), but **never shown in
   the UI and never used by the suggestion engine**. A recipe cooked 30× and one cooked
   1× get identical weight if they were last cooked on the same day.
2. **`cook_log` table** — the full history is fetched on every load
   (`src/lib/supabase.ts:99`) and cached, but only the **single most-recent entry** is
   used, via `lastCookedBase` (`src/lib/suggest.ts:35-37`), to auto-populate `avoidBase`.

## Guiding principle

Recency stays the **primary** axis — it's the identity of the app. `timesCooked` and the
cook-log depth are **secondary signals** that refine the draw and enrich the UI. Keep
`src/lib/suggest.ts` pure and dependency-free; inject `rng`/`now` for determinism; update
`src/lib/suggest.test.ts` whenever weighting/filtering changes (per `CLAUDE.md`).

---

## Step 1 — Display `timesCooked` (pure UI, no engine change)

Lowest risk, highest "it finally does something" payoff. Makes the README tip ("the more
you log, the smarter it gets") honest.

- **Tonight card** (`src/screens/Tonight.tsx`): the card already shows "when you last
  made it" — append "· cooked 12×".
- **Recipes tab** (`src/screens/Recipes.tsx`): show a **Never tried** badge when
  `timesCooked === 0` and a **Favorite** badge for high counts; optionally a
  sort-by-most/least-cooked control.

No changes to `suggest.ts`, so no test churn.

---

## Step 2 — `timesCooked` as a "favorite" boost in the weight

Goal: among recipes that are *already* forgotten, bubble up the ones you've historically
loved. This is exactly the README promise ("favorites stop slipping out of rotation").

In `src/lib/suggest.ts`, make it a mild **multiplicative** boost on the existing recency
weight:

```ts
export const FREQ_K = 0.15; // gentle; tune to taste
export const MAX_FREQ_BOOST = 1.5; // cap so staples don't bulldoze

export function recipeWeight(recipe: Recipe, now: Date): number {
  const recency = recipe.lastCookedDate
    ? 1 + Math.min(daysSince(recipe.lastCookedDate, now), MAX_DAYS)
    : BASE_NEW;
  const boost = Math.min(1 + FREQ_K * Math.log1p(recipe.timesCooked), MAX_FREQ_BOOST);
  return recency * boost;
}
```

Why this shape:
- **Recency still gates everything.** A 50×-cooked dish cooked yesterday has recency ≈ 1,
  so it stays buried; the boost only matters among forgotten recipes.
- **`log1p` + cap dampen** so a 50× recipe doesn't dominate a 5× one.
- **Never-cooked recipes are unaffected:** `timesCooked` is 0 → `log1p(0) = 0` → boost = 1,
  so `BASE_NEW` still holds and the existing `recipeWeight(fresh) === BASE_NEW` test passes.

Alternative philosophy (NOT recommended here): penalize over-cooked recipes to force
variety. Rejected because novelty is already covered by `BASE_NEW` for untried recipes,
and the README's stated goal is resurfacing favorites, not maximizing novelty.

**Tests:** update `src/lib/suggest.test.ts` — add a case asserting that, for equal
recency, a higher `timesCooked` yields a higher weight; confirm the never-cooked baseline
and the "today < weeks-ago" ordering still hold.

---

## Step 3 — Multi-night base rotation from `cook_log`

Today only last night's base is avoided. Use the log depth to rotate across the last N
nights. Given the small recipe set, apply a **soft penalty in the weight**, NOT a hard
filter (hard-excluding 2-3 bases could empty the candidate pool).

- Generalize `lastCookedBase` → `recentBases(data, n)` returning a `Set<Base>` of the
  bases from the last `n` cook-log entries.
- In `suggest()`, discount candidates whose base is in that set:

```ts
export const BASE_REPEAT_PENALTY = 0.5;
// weight *= recentBases.has(r.base) ? BASE_REPEAT_PENALTY : 1;
```

This serves the README's "rotate your bases" promise and is the foundation for the
**Week view** (deferred idea in `SETUP.md`): a 7-night menu is essentially running
`suggest` 7× while feeding each pick's base back into the recent-base set.

**Tests:** update `suggest.test.ts` for `recentBases` and the penalty.

---

## Step 4 — History UI (larger, optional)

The full log is fetched but never visible. Add a **History** surface:

- A third tab via **tab state in `App.tsx`** — **no router** needed, so the GitHub Pages
  deploy is unaffected (keep it that way per `CLAUDE.md`).
- A reverse-chronological "recently cooked" list (or a light calendar) sourced from
  `cookLog` joined to recipe names.

---

## Cleanup — resolve the `timesCooked` / `cook_log` redundancy

`timesCooked` and `cook_log` record the same fact. The mutation in `supabase.ts:158` does
`times_cooked + 1` *and* appends a log row, so deleting/correcting a log row silently
desyncs the counter. Two options:

- **Preferred — derive** `timesCooked` from the log (count rows per `recipe_id`) and drop
  the denormalized column. Single source of truth, no drift, and the log is already
  fetched in full.
- **Or keep** the column as a deliberate cache, documented as derived/reconcilable.

---

## Suggested PR grouping

- **PR 1:** Step 1 + Step 2 (display + favorite boost). Highest value-to-risk; keeps the
  engine pure and tested. Also update README/SETUP wording so docs match the new logic.
- **PR 2:** Step 3 (multi-night rotation).
- **PR 3:** Step 4 (History tab) and/or Week view.
- Fold the redundancy cleanup into whichever PR first touches the cook-log read path.

## Docs to update alongside code

- `README.md` — the "the more you tap Cooked it, the smarter it gets" tip becomes true
  once Step 2 lands; mention the cook count if Step 1 adds it to the UI.
- `SETUP.md` — the "How suggestions work" section should note the frequency boost and
  multi-night base rotation.
