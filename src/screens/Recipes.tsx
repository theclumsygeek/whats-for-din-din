import { useMemo, useState } from 'react';
import { useData } from '../state/DataProvider';
import type { Base, Effort, Recipe } from '../lib/types';
import { EFFORTS, EFFORT_LABEL, BASES } from '../lib/types';
import type { RecipeInput } from '../lib/supabase';
import {
  BASE_EMOJI,
  BASE_LABEL,
  cookCountLabel,
  isFavorite,
  isForgotten,
  isNew,
  lastCookedLabel,
} from '../lib/format';

export function Recipes() {
  const { data } = useData();
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);

  const sorted = useMemo(
    () =>
      [...data.recipes].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [data.recipes],
  );

  if (editing) {
    return (
      <RecipeForm
        recipe={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Recipes</h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="btn-primary px-4 py-2 text-sm"
        >
          ＋ Add
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-soft dark:text-earth-100">
          No recipes yet. Add your Well Your World favorites to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <RecipeRow key={r.id} recipe={r} onEdit={() => setEditing(r)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeRow({
  recipe,
  onEdit,
}: {
  recipe: Recipe;
  onEdit: () => void;
}) {
  const forgotten = isForgotten(recipe);
  const fresh = isNew(recipe);
  const favorite = isFavorite(recipe);
  const countLabel = cookCountLabel(recipe);
  return (
    <li
      className={`card flex items-center gap-3 p-3 ${
        recipe.active ? '' : 'opacity-50'
      }`}
    >
      <span className="text-2xl">{BASE_EMOJI[recipe.base]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold">{recipe.name}</p>
          {fresh && (
            <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-600 dark:bg-brand-900/50 dark:text-brand-200">
              New
            </span>
          )}
          {favorite && (
            <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              ★ Favorite
            </span>
          )}
          {forgotten && (
            <span className="shrink-0 rounded-full bg-earth-200 px-2 py-0.5 text-[10px] font-bold uppercase text-earth-400 dark:bg-brand-900/50 dark:text-brand-200">
              Forgotten
            </span>
          )}
        </div>
        <p className="text-xs text-ink-soft dark:text-earth-100">
          {BASE_LABEL[recipe.base]} · {EFFORT_LABEL[recipe.effort]} ·{' '}
          {lastCookedLabel(recipe)}
          {countLabel && ` · ${countLabel.toLowerCase()}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full px-3 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/10"
      >
        Edit
      </button>
    </li>
  );
}

const BLANK: RecipeInput = {
  name: '',
  sourceUrl: '',
  base: 'rice',
  mainIngredients: [],
  effort: 'quick',
  notes: '',
};

function RecipeForm({
  recipe,
  onClose,
}: {
  recipe: Recipe | null;
  onClose: () => void;
}) {
  const { addRecipe, updateRecipe, setActive } = useData();
  const [form, setForm] = useState<RecipeInput>(
    recipe
      ? {
          name: recipe.name,
          sourceUrl: recipe.sourceUrl ?? '',
          base: recipe.base,
          mainIngredients: recipe.mainIngredients,
          effort: recipe.effort,
          notes: recipe.notes ?? '',
        }
      : BLANK,
  );
  const [ingredientsText, setIngredientsText] = useState(
    (recipe?.mainIngredients ?? []).join(', '),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof RecipeInput>(key: K, value: RecipeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: RecipeInput = {
      ...form,
      mainIngredients: ingredientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (recipe) await updateRecipe(recipe.id, payload);
      else await addRecipe(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function toggleRetire() {
    if (!recipe) return;
    setBusy(true);
    try {
      await setActive(recipe.id, !recipe.active);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">
          {recipe ? 'Edit recipe' : 'Add recipe'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1 text-sm font-semibold text-ink-soft dark:text-earth-100"
        >
          Cancel
        </button>
      </div>

      <Field label="Name">
        <input
          required
          className="field"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Smoky Black Bean Bowl"
        />
      </Field>

      <Field label="Recipe link (optional)">
        <input
          type="url"
          className="field"
          value={form.sourceUrl}
          onChange={(e) => set('sourceUrl', e.target.value)}
          placeholder="https://wellyourworld.com/..."
        />
      </Field>

      <Field label="Base">
        <div className="flex flex-wrap gap-2">
          {BASES.map((b) => (
            <button
              key={b}
              type="button"
              className={form.base === b ? 'chip-on' : 'chip-off'}
              onClick={() => set('base', b as Base)}
            >
              {BASE_LABEL[b]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Effort / mood">
        <div className="flex flex-wrap gap-2">
          {EFFORTS.map((ef) => (
            <button
              key={ef}
              type="button"
              className={form.effort === ef ? 'chip-on' : 'chip-off'}
              onClick={() => set('effort', ef as Effort)}
            >
              {EFFORT_LABEL[ef]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Main ingredients (comma-separated)">
        <input
          className="field"
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder="black beans, sweet potato, kale"
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          className="field min-h-[72px]"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Double the sauce; great for leftovers."
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Saving…' : 'Save recipe'}
      </button>

      {recipe && (
        <button
          type="button"
          onClick={toggleRetire}
          disabled={busy}
          className="btn-ghost w-full"
        >
          {recipe.active ? 'Retire from rotation' : 'Restore to rotation'}
        </button>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
