import type { Grain, Recipe } from './types';
import { daysSince } from './suggest';

export const GRAIN_LABEL: Record<Grain, string> = {
  rice: 'Rice',
  pasta: 'Pasta',
  potato: 'Potato',
  bread: 'Bread',
  wrap: 'Wrap',
  none: 'No grain',
  other: 'Other',
};

export const GRAIN_EMOJI: Record<Grain, string> = {
  rice: '🍚',
  pasta: '🍝',
  potato: '🥔',
  bread: '🍞',
  wrap: '🌯',
  none: '🥗',
  other: '🍽️',
};

/** Human label for how long since a recipe was last cooked. */
export function lastCookedLabel(recipe: Recipe, now = new Date()): string {
  if (!recipe.lastCookedDate) return 'Never made';
  const d = daysSince(recipe.lastCookedDate, now);
  if (d === 0) return 'Made today';
  if (d === 1) return 'Made yesterday';
  if (d < 14) return `Made ${d} days ago`;
  if (d < 60) return `Made ${Math.round(d / 7)} weeks ago`;
  return `Made ${Math.round(d / 30)} months ago`;
}

/** True when a recipe is "forgotten" — worth highlighting in the list. */
export function isForgotten(recipe: Recipe, now = new Date()): boolean {
  if (!recipe.active) return false;
  if (!recipe.lastCookedDate) return true;
  return daysSince(recipe.lastCookedDate, now) >= 21;
}
