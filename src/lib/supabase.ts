import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, CookLogEntry, Recipe } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when the env vars are present, so the UI can show a setup hint. */
export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const todayISO = () => new Date().toISOString().slice(0, 10);

// ---- row <-> model mapping (snake_case DB columns <-> camelCase app types) ----

interface RecipeRow {
  id: string;
  name: string;
  source_url: string | null;
  base: Recipe['base'];
  main_ingredients: string[] | null;
  effort: Recipe['effort'];
  notes: string | null;
  active: boolean;
  last_cooked_date: string | null;
  times_cooked: number;
}

interface CookLogRow {
  id: string;
  recipe_id: string;
  date: string;
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    sourceUrl: row.source_url ?? undefined,
    base: row.base,
    mainIngredients: row.main_ingredients ?? [],
    effort: row.effort,
    notes: row.notes ?? undefined,
    active: row.active,
    lastCookedDate: row.last_cooked_date ?? undefined,
    timesCooked: row.times_cooked,
  };
}

function toCookLog(row: CookLogRow): CookLogEntry {
  return { id: row.id, recipeId: row.recipe_id, date: row.date };
}

/** Fields a user can edit on the Recipes screen. */
export type RecipeInput = Pick<
  Recipe,
  'name' | 'sourceUrl' | 'base' | 'mainIngredients' | 'effort' | 'notes'
>;

function toRow(input: RecipeInput) {
  return {
    name: input.name.trim(),
    source_url: input.sourceUrl?.trim() || null,
    base: input.base,
    main_ingredients: input.mainIngredients
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    effort: input.effort,
    notes: input.notes?.trim() || null,
  };
}

// ---- auth ----

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ---- data ----

export async function fetchData(): Promise<AppData> {
  const [recipesRes, logRes] = await Promise.all([
    supabase.from('recipes').select('*').order('name'),
    supabase.from('cook_log').select('*'),
  ]);
  if (recipesRes.error) throw recipesRes.error;
  if (logRes.error) throw logRes.error;
  return {
    recipes: (recipesRes.data as RecipeRow[]).map(toRecipe),
    cookLog: (logRes.data as CookLogRow[]).map(toCookLog),
  };
}

export async function addRecipe(input: RecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert(toRow(input))
    .select('*')
    .single();
  if (error) throw error;
  return toRecipe(data as RecipeRow);
}

export async function updateRecipe(
  id: string,
  input: RecipeInput,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update(toRow(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toRecipe(data as RecipeRow);
}

/** Soft-retire / un-retire without deleting history. */
export async function setRecipeActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ active })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Record a cook: append a cook_log row and bump the recipe's last_cooked_date /
 * times_cooked so it drops down the rotation.
 */
export async function markCooked(recipe: Recipe): Promise<void> {
  const date = todayISO();
  const logRes = await supabase
    .from('cook_log')
    .insert({ recipe_id: recipe.id, date });
  if (logRes.error) throw logRes.error;

  const updRes = await supabase
    .from('recipes')
    .update({ last_cooked_date: date, times_cooked: recipe.timesCooked + 1 })
    .eq('id', recipe.id);
  if (updRes.error) throw updRes.error;
}
