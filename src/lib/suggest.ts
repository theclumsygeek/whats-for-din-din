import type { AppData, Base, Recipe, SuggestFilters } from './types';

/**
 * Weight assigned to a never-cooked recipe, expressed in "equivalent days since
 * last cooked". High enough that brand-new recipes reliably surface, without
 * automatically beating genuinely long-forgotten favorites.
 */
export const BASE_NEW = 60;

/** Cap so an ancient recipe doesn't completely dominate the draw. */
export const MAX_DAYS = 120;

/**
 * How strongly historical cook count nudges a recipe up. Gentle and
 * logarithmic so a beloved staple bubbles up among forgotten dishes without
 * bulldozing the rest. Recency still gates everything.
 */
export const FREQ_K = 0.15;

/** Cap on the frequency multiplier so staples can't dominate the draw. */
export const MAX_FREQ_BOOST = 1.5;

/** Number of recent cook-log entries whose bases we rotate away from. */
export const RECENT_BASE_NIGHTS = 3;

/** Multiplier applied to a candidate whose base was cooked in the last few nights. */
export const BASE_REPEAT_PENALTY = 0.5;

export function normalizeIngredient(s: string): string {
  return s.trim().toLowerCase();
}

/** Whole days between an ISO date (YYYY-MM-DD) and `now`, floored at 0. */
export function daysSince(isoDate: string, now: Date): number {
  const from = new Date(`${isoDate}T00:00:00`);
  const ms = now.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Recency weight — the core anti-forgetting mechanism. The longer since a recipe
 * was cooked, the higher its weight; never-cooked recipes get a high baseline.
 *
 * A mild, capped multiplicative boost from `timesCooked` lets historical
 * favorites bubble up *among recipes that are already forgotten*. Recency still
 * gates: a 50×-cooked dish made yesterday has recency ≈ 1 and stays buried.
 * Never-cooked recipes have `timesCooked === 0`, so the boost is 1 and the
 * `BASE_NEW` baseline is preserved exactly.
 */
export function recipeWeight(recipe: Recipe, now: Date): number {
  const recency = recipe.lastCookedDate
    ? 1 + Math.min(daysSince(recipe.lastCookedDate, now), MAX_DAYS)
    : BASE_NEW;
  const boost = Math.min(
    1 + FREQ_K * Math.log1p(Math.max(recipe.timesCooked, 0)),
    MAX_FREQ_BOOST,
  );
  return recency * boost;
}

/** Base of the most recently cooked recipe, to auto-rotate away from it. */
export function lastCookedBase(data: AppData): Base | undefined {
  if (data.cookLog.length === 0) return undefined;
  const latest = data.cookLog.reduce((a, b) => (b.date > a.date ? b : a));
  return data.recipes.find((r) => r.id === latest.recipeId)?.base;
}

/**
 * Bases of the `n` most recent cook-log entries — the set we softly rotate away
 * from so the week doesn't lean on one base. Day-granular dates are sorted
 * descending; ties keep an arbitrary-but-stable order (fine for one cook/night).
 */
export function recentBases(data: AppData, n: number): Set<Base> {
  if (n <= 0 || data.cookLog.length === 0) return new Set();
  const baseOf = new Map(data.recipes.map((r) => [r.id, r.base]));
  const bases = [...data.cookLog]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, n)
    .map((e) => baseOf.get(e.recipeId))
    .filter((b): b is Base => b !== undefined);
  return new Set(bases);
}

/** Apply the active + base + effort + (strict ALL-match) ingredient filters. */
export function filterCandidates(
  recipes: Recipe[],
  filters: SuggestFilters,
): Recipe[] {
  const needed = (filters.useIngredients ?? [])
    .map(normalizeIngredient)
    .filter(Boolean);

  return recipes.filter((r) => {
    if (!r.active) return false;
    if (filters.avoidBase && r.base === filters.avoidBase) return false;
    if (filters.effort && r.effort !== filters.effort) return false;
    if (needed.length > 0) {
      const have = new Set(r.mainIngredients.map(normalizeIngredient));
      // ALL semantics: recipe must contain every requested ingredient.
      if (!needed.every((i) => have.has(i))) return false;
    }
    return true;
  });
}

/**
 * Weighted random ordering (Efraimidis–Spirakis). Higher weight ⇒ tends to rank
 * higher, but with randomness so repeated calls vary ("Surprise me"). With a
 * constant rng it degrades to a deterministic sort by weight (used in tests).
 */
export function weightedShuffle<T>(
  items: T[],
  weightOf: (item: T) => number,
  rng: () => number,
): T[] {
  return items
    .map((item) => {
      const w = Math.max(weightOf(item), 1e-9);
      return { item, key: Math.pow(rng(), 1 / w) };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

export interface SuggestOptions {
  now?: Date;
  rng?: () => number;
  /** How many ranked recipes to return (top pick + alternates). */
  count?: number;
}

/**
 * Suggest tonight's meal(s): filter the pool, weight by recency so forgotten
 * favorites rise, then draw a weighted-random ranked list.
 */
export function suggest(
  data: AppData,
  filters: SuggestFilters = {},
  options: SuggestOptions = {},
): Recipe[] {
  const now = options.now ?? new Date();
  const rng = options.rng ?? Math.random;
  const count = options.count ?? 4;

  const candidates = filterCandidates(data.recipes, filters);
  // Soft-penalize bases cooked over the last few nights (the hard `avoidBase`
  // already removes last night's base entirely; this rotates nights 2..N).
  const recent = recentBases(data, RECENT_BASE_NIGHTS);
  const weightOf = (r: Recipe) =>
    recipeWeight(r, now) * (recent.has(r.base) ? BASE_REPEAT_PENALTY : 1);
  const ranked = weightedShuffle(candidates, weightOf, rng);
  return ranked.slice(0, count);
}

/** Distinct, normalized ingredient list across all recipes (for filter chips). */
export function allIngredients(recipes: Recipe[]): string[] {
  const set = new Set<string>();
  for (const r of recipes) {
    for (const i of r.mainIngredients) {
      const n = normalizeIngredient(i);
      if (n) set.add(n);
    }
  }
  return [...set].sort();
}
