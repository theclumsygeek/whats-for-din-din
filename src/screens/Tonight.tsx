import { useMemo, useState } from 'react';
import { useData } from '../state/DataProvider';
import { allIngredients, lastCookedBase, suggest } from '../lib/suggest';
import type { Base, Effort, Recipe, SuggestFilters } from '../lib/types';
import { EFFORTS, EFFORT_LABEL, BASES } from '../lib/types';
import { BASE_EMOJI, BASE_LABEL, lastCookedLabel } from '../lib/format';

export function Tonight() {
  const { data, markCooked } = useData();

  const autoAvoidBase = useMemo(() => lastCookedBase(data), [data]);
  const ingredients = useMemo(() => allIngredients(data.recipes), [data.recipes]);

  const [avoidBase, setAvoidBase] = useState<Base | undefined>(autoAvoidBase);
  const [effort, setEffort] = useState<Effort | undefined>();
  const [useIngredients, setUseIngredients] = useState<string[]>([]);
  const [seed, setSeed] = useState(0); // bump to reroll
  const [cooking, setCooking] = useState(false);

  const filters: SuggestFilters = { avoidBase, effort, useIngredients };

  const [selectedId, setSelectedId] = useState<string | undefined>();

  const ranked = useMemo(
    () => suggest(data, filters, { count: 4 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, avoidBase, effort, useIngredients, seed],
  );

  // A tap on an alternate promotes it to tonight's pick; otherwise the
  // engine's top result leads.
  const ordered = useMemo(() => {
    const chosen = selectedId && ranked.find((r) => r.id === selectedId);
    if (!chosen) return ranked;
    return [chosen, ...ranked.filter((r) => r.id !== chosen.id)];
  }, [ranked, selectedId]);

  const [pick, ...alternates] = ordered;

  function reroll() {
    setSelectedId(undefined);
    setSeed((s) => s + 1);
  }

  function toggleIngredient(i: string) {
    setUseIngredients((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  async function cookedIt() {
    if (!pick) return;
    setCooking(true);
    try {
      await markCooked(pick);
      setAvoidBase(pick.base); // rotate away from tonight's base next time
      setSelectedId(undefined);
      setSeed((s) => s + 1);
    } finally {
      setCooking(false);
    }
  }

  if (data.recipes.length === 0) {
    return (
      <EmptyState />
    );
  }

  return (
    <div className="space-y-5">
      <Filters
        avoidBase={avoidBase}
        setAvoidBase={setAvoidBase}
        effort={effort}
        setEffort={setEffort}
        ingredients={ingredients}
        useIngredients={useIngredients}
        toggleIngredient={toggleIngredient}
      />

      {pick ? (
        <SuggestionCard recipe={pick} />
      ) : (
        <div className="card p-6 text-center text-ink-soft dark:text-earth-100">
          No recipes match those filters. Try loosening them.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={reroll}
          className="btn-ghost"
        >
          🎲 Surprise me
        </button>
        <button
          type="button"
          onClick={cookedIt}
          disabled={!pick || cooking}
          className="btn-primary"
        >
          {cooking ? 'Saving…' : '✅ Cooked it'}
        </button>
      </div>

      {alternates.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold text-ink-soft dark:text-earth-100">
            Or maybe…
          </h3>
          <ul className="space-y-2">
            {alternates.map((r) => (
              <AlternateRow key={r.id} recipe={r} onPick={() => setSelectedId(r.id)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-brand-600 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white">
        Tonight's pick
      </div>
      <div className="p-5">
        <div className="mb-1 text-4xl">{BASE_EMOJI[recipe.base]}</div>
        <h2 className="text-2xl font-extrabold leading-tight">{recipe.name}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="chip-off">{BASE_LABEL[recipe.base]}</span>
          <span className="chip-off">{EFFORT_LABEL[recipe.effort]}</span>
          <span className="chip-off">{lastCookedLabel(recipe)}</span>
        </div>
        {recipe.mainIngredients.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft dark:text-earth-100">
            {recipe.mainIngredients.join(' · ')}
          </p>
        )}
        {recipe.notes && (
          <p className="mt-2 text-sm italic text-ink-soft dark:text-earth-100">
            {recipe.notes}
          </p>
        )}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-bold text-brand-600 hover:underline dark:text-brand-300"
          >
            View recipe ↗
          </a>
        )}
      </div>
    </div>
  );
}

function AlternateRow({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) {
  return (
    <li className="card flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title="Make this tonight's pick"
      >
        <span className="text-2xl">{BASE_EMOJI[recipe.base]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{recipe.name}</p>
          <p className="text-xs text-ink-soft dark:text-earth-100">
            {BASE_LABEL[recipe.base]} · {lastCookedLabel(recipe)}
          </p>
        </div>
      </button>
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-brand-600 dark:text-brand-300"
        >
          ↗
        </a>
      )}
    </li>
  );
}

function Filters({
  avoidBase,
  setAvoidBase,
  effort,
  setEffort,
  ingredients,
  useIngredients,
  toggleIngredient,
}: {
  avoidBase: Base | undefined;
  setAvoidBase: (b: Base | undefined) => void;
  effort: Effort | undefined;
  setEffort: (e: Effort | undefined) => void;
  ingredients: string[];
  useIngredients: string[];
  toggleIngredient: (i: string) => void;
}) {
  const [showIngredients, setShowIngredients] = useState(false);

  return (
    <div className="card space-y-3 p-4">
      <FilterRow label="Avoid base">
        {BASES.map((b) => (
          <button
            key={b}
            type="button"
            className={avoidBase === b ? 'chip-on' : 'chip-off'}
            onClick={() => setAvoidBase(avoidBase === b ? undefined : b)}
          >
            {BASE_LABEL[b]}
          </button>
        ))}
      </FilterRow>

      <FilterRow label="Effort">
        {EFFORTS.map((e) => (
          <button
            key={e}
            type="button"
            className={effort === e ? 'chip-on' : 'chip-off'}
            onClick={() => setEffort(effort === e ? undefined : e)}
          >
            {EFFORT_LABEL[e]}
          </button>
        ))}
      </FilterRow>

      {ingredients.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowIngredients((s) => !s)}
            className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-ink-soft dark:text-earth-100"
          >
            <span>
              Use these (all)
              {useIngredients.length > 0 && (
                <span className="ml-1 normal-case text-brand-600 dark:text-brand-300">
                  · {useIngredients.length} selected
                </span>
              )}
            </span>
            <span aria-hidden>{showIngredients ? '▴' : '▾'}</span>
          </button>
          {showIngredients && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ingredients.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={useIngredients.includes(i) ? 'chip-on' : 'chip-off'}
                  onClick={() => toggleIngredient(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft dark:text-earth-100">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card mt-6 p-6 text-center">
      <div className="mb-2 text-4xl">📖</div>
      <h2 className="text-lg font-bold">No recipes yet</h2>
      <p className="mt-1 text-sm text-ink-soft dark:text-earth-100">
        Head to the <strong>Recipes</strong> tab and add your favorites — then
        come back and tap Surprise me.
      </p>
    </div>
  );
}
