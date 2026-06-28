import type { Base, Recipe } from './types';
import { daysSince } from './suggest';

export const BASE_LABEL: Record<Base, string> = {
  rice: 'Rice',
  pasta: 'Pasta',
  potato: 'Potato',
  bread: 'Bread',
  wrap: 'Wrap',
  beans: 'Beans',
  soup: 'Soup',
  salad: 'Salad',
  none: 'No base',
  other: 'Other',
};

export const BASE_EMOJI: Record<Base, string> = {
  rice: '🍚',
  pasta: '🍝',
  potato: '🥔',
  bread: '🍞',
  wrap: '🌯',
  beans: '🫘',
  soup: '🍲',
  salad: '🥗',
  none: '➖',
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

/** Cook count at or above which a recipe earns a "Favorite" badge. */
export const FAVORITE_THRESHOLD = 5;

/** Short cook-count label, e.g. "Cooked 12×". Null when never cooked. */
export function cookCountLabel(recipe: Recipe): string | null {
  if (recipe.timesCooked <= 0) return null;
  return `Cooked ${recipe.timesCooked}×`;
}

/** Human label for a cook-log date — relative for recent, dated otherwise. */
export function cookDateLabel(isoDate: string, now = new Date()): string {
  const d = daysSince(isoDate, now);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** True when a recipe has never been cooked — worth highlighting as new. */
export function isNew(recipe: Recipe): boolean {
  return recipe.active && !recipe.lastCookedDate;
}

/** True when a recipe has been cooked often enough to be a proven favorite. */
export function isFavorite(recipe: Recipe): boolean {
  return recipe.timesCooked >= FAVORITE_THRESHOLD;
}

/** True when a recipe is "forgotten" — cooked before, but not in a while. */
export function isForgotten(recipe: Recipe, now = new Date()): boolean {
  if (!recipe.active) return false;
  if (!recipe.lastCookedDate) return false;
  return daysSince(recipe.lastCookedDate, now) >= 21;
}
