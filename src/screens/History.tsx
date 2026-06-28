import { useMemo } from 'react';
import { useData } from '../state/DataProvider';
import { BASE_EMOJI, BASE_LABEL, cookDateLabel } from '../lib/format';

export function History() {
  const { data } = useData();

  // Reverse-chronological cook log, joined to recipe names/bases.
  const entries = useMemo(() => {
    const byId = new Map(data.recipes.map((r) => [r.id, r]));
    return [...data.cookLog]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map((e) => ({ entry: e, recipe: byId.get(e.recipeId) }));
  }, [data]);

  if (entries.length === 0) {
    return (
      <div className="card mt-6 p-6 text-center">
        <div className="mb-2 text-4xl">🗓️</div>
        <h2 className="text-lg font-bold">No cooks logged yet</h2>
        <p className="mt-1 text-sm text-ink-soft dark:text-earth-100">
          Tap <strong>Cooked it</strong> on the Tonight screen and your history
          will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-extrabold">History</h2>
      <ul className="space-y-2">
        {entries.map(({ entry, recipe }) => (
          <li key={entry.id} className="card flex items-center gap-3 p-3">
            <span className="text-2xl">
              {recipe ? BASE_EMOJI[recipe.base] : '🍽️'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {recipe ? recipe.name : 'Removed recipe'}
              </p>
              {recipe && (
                <p className="text-xs text-ink-soft dark:text-earth-100">
                  {BASE_LABEL[recipe.base]}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold text-ink-soft dark:text-earth-100">
              {cookDateLabel(entry.date)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
