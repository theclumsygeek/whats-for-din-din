import type { AppData, Base, Recipe, SuggestFilters } from './types';

/**
 * Weight assigned to a never-cooked recipe, expressed in "equivalent days since
 * last cooked". High enough that brand-new recipes reliably surface, without
 * automatically beating genuinely long-forgotten favorites.
 */
export const BASE_NEW = 60;

/** Cap so an ancient recipe doesn't completely dominate the draw. */
export const MAX_DAYS = 120;

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
 */
export function recipeWeight(recipe: Recipe, now: Date): number {
  if (!recipe.lastCookedDate) return BASE_NEW;
  return 1 + Math.min(daysSince(recipe.lastCookedDate, now), MAX_DAYS);
}

/** Base of the most recently cooked recipe, to auto-rotate away from it. */
export function lastCookedBase(data: AppData): Base | undefined {
  if (data.cookLog.length === 0) return undefined;
  const latest = data.cookLog.reduce((a, b) => (b.date > a.date ? b : a));
  return data.recipes.find((r) => r.id === latest.recipeId)?.base;
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
  const ranked = weightedShuffle(candidates, (r) => recipeWeight(r, now), rng);
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
