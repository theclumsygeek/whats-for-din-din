import { describe, it, expect } from 'vitest';
import type { AppData, Recipe } from './types';
import {
  daysSince,
  recipeWeight,
  lastCookedBase,
  filterCandidates,
  suggest,
  BASE_NEW,
} from './suggest';

const NOW = new Date('2026-06-27T12:00:00');

function isoDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function recipe(partial: Partial<Recipe> & { id: string; name: string }): Recipe {
  return {
    sourceUrl: undefined,
    base: 'rice',
    mainIngredients: [],
    effort: 'quick',
    notes: undefined,
    active: true,
    lastCookedDate: undefined,
    timesCooked: 0,
    ...partial,
  };
}

// Constant rng makes weightedShuffle a deterministic sort by weight (desc).
const fixedRng = () => 0.5;

describe('recency weighting', () => {
  it('daysSince counts whole days, floored at 0', () => {
    expect(daysSince(isoDaysAgo(21), NOW)).toBe(21);
    expect(daysSince(isoDaysAgo(0), NOW)).toBe(0);
    // future date clamps to 0
    expect(daysSince('2999-01-01', NOW)).toBe(0);
  });

  it('a recipe cooked today weighs far less than one cooked weeks ago', () => {
    const today = recipe({ id: 't', name: 'Today', lastCookedDate: isoDaysAgo(0) });
    const weeksAgo = recipe({ id: 'w', name: 'Weeks', lastCookedDate: isoDaysAgo(21) });
    expect(recipeWeight(today, NOW)).toBeLessThan(recipeWeight(weeksAgo, NOW));
  });

  it('never-cooked recipes get a substantial baseline weight', () => {
    const fresh = recipe({ id: 'n', name: 'New' });
    expect(recipeWeight(fresh, NOW)).toBe(BASE_NEW);
    expect(recipeWeight(fresh, NOW)).toBeGreaterThan(0);
  });
});

describe('filterCandidates', () => {
  const pool: Recipe[] = [
    recipe({ id: 'a', name: 'Rice quick', base: 'rice', effort: 'quick', mainIngredients: ['mushroom', 'spinach'] }),
    recipe({ id: 'b', name: 'Pasta medium', base: 'pasta', effort: 'medium', mainIngredients: ['mushroom'] }),
    recipe({ id: 'c', name: 'Retired', base: 'rice', active: false }),
  ];

  it('drops inactive recipes', () => {
    expect(filterCandidates(pool, {}).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('avoidBase excludes last night\'s base', () => {
    expect(filterCandidates(pool, { avoidBase: 'rice' }).map((r) => r.id)).toEqual(['b']);
  });

  it('effort narrows the pool', () => {
    expect(filterCandidates(pool, { effort: 'medium' }).map((r) => r.id)).toEqual(['b']);
  });

  it('ingredient filter uses strict ALL-match semantics', () => {
    // only "a" has BOTH mushroom AND spinach
    expect(
      filterCandidates(pool, { useIngredients: ['mushroom', 'spinach'] }).map((r) => r.id),
    ).toEqual(['a']);
    // both have mushroom
    expect(
      filterCandidates(pool, { useIngredients: ['Mushroom'] }).map((r) => r.id),
    ).toEqual(['a', 'b']);
  });
});

describe('lastCookedBase', () => {
  it('returns the base of the most recently cooked recipe', () => {
    const data: AppData = {
      recipes: [
        recipe({ id: 'a', name: 'A', base: 'rice' }),
        recipe({ id: 'b', name: 'B', base: 'pasta' }),
      ],
      cookLog: [
        { id: '1', recipeId: 'a', date: isoDaysAgo(3) },
        { id: '2', recipeId: 'b', date: isoDaysAgo(1) },
      ],
    };
    expect(lastCookedBase(data)).toBe('pasta');
  });

  it('returns undefined when nothing has been cooked', () => {
    expect(lastCookedBase({ recipes: [], cookLog: [] })).toBeUndefined();
  });
});

describe('suggest', () => {
  const data: AppData = {
    recipes: [
      recipe({ id: 'today', name: 'Just cooked', lastCookedDate: isoDaysAgo(0) }),
      recipe({ id: 'forgotten', name: 'Forgotten fave', lastCookedDate: isoDaysAgo(40) }),
      recipe({ id: 'new', name: 'Never tried' }),
    ],
    cookLog: [],
  };

  it('ranks forgotten/never-cooked above just-cooked', () => {
    const ranked = suggest(data, {}, { now: NOW, rng: fixedRng, count: 3 });
    expect(ranked[ranked.length - 1].id).toBe('today');
    expect(ranked.map((r) => r.id)).toContain('forgotten');
    expect(ranked.map((r) => r.id)).toContain('new');
  });

  it('respects filters and returns at most `count`', () => {
    const ranked = suggest(data, { effort: 'quick' }, { now: NOW, rng: fixedRng, count: 2 });
    expect(ranked.length).toBe(2);
  });
});
