export const GRAINS = [
  'rice',
  'pasta',
  'potato',
  'bread',
  'wrap',
  'none',
  'other',
] as const;
export type Grain = (typeof GRAINS)[number];

export const EFFORTS = ['quick', 'medium', 'project'] as const;
export type Effort = (typeof EFFORTS)[number];

export const EFFORT_LABEL: Record<Effort, string> = {
  quick: 'Quick',
  medium: 'Medium',
  project: 'Project',
};

export interface Recipe {
  id: string;
  name: string;
  sourceUrl?: string;
  grain: Grain;
  mainIngredients: string[];
  effort: Effort;
  notes?: string;
  active: boolean;
  lastCookedDate?: string; // ISO date (YYYY-MM-DD)
  timesCooked: number;
}

export interface CookLogEntry {
  id: string;
  recipeId: string;
  date: string; // ISO date (YYYY-MM-DD)
}

export interface AppData {
  recipes: Recipe[];
  cookLog: CookLogEntry[];
}

/** Filters the user can apply when asking for a suggestion. */
export interface SuggestFilters {
  /** Exclude recipes using this grain (auto-set to last night's grain). */
  avoidGrain?: Grain;
  /** Only recipes matching this effort/mood level. */
  effort?: Effort;
  /** Recipe must contain EVERY one of these ingredients (strict / ALL match). */
  useIngredients?: string[];
}
