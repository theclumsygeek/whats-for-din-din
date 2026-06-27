import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppData, Recipe } from '../lib/types';
import { loadCachedData, saveCachedData } from '../lib/cache';
import {
  addRecipe as apiAdd,
  fetchData,
  markCooked as apiMarkCooked,
  setRecipeActive,
  updateRecipe as apiUpdate,
  type RecipeInput,
} from '../lib/supabase';

interface DataContextValue {
  data: AppData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addRecipe: (input: RecipeInput) => Promise<void>;
  updateRecipe: (id: string, input: RecipeInput) => Promise<void>;
  setActive: (id: string, active: boolean) => Promise<void>;
  markCooked: (recipe: Recipe) => Promise<void>;
}

const EMPTY: AppData = { recipes: [], cookLog: [] };

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadCachedData() ?? EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const fresh = await fetchData();
      setData(fresh);
      saveCachedData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addRecipe = useCallback(
    async (input: RecipeInput) => {
      await apiAdd(input);
      await refresh();
    },
    [refresh],
  );

  const updateRecipe = useCallback(
    async (id: string, input: RecipeInput) => {
      await apiUpdate(id, input);
      await refresh();
    },
    [refresh],
  );

  const setActive = useCallback(
    async (id: string, active: boolean) => {
      await setRecipeActive(id, active);
      await refresh();
    },
    [refresh],
  );

  const markCooked = useCallback(
    async (recipe: Recipe) => {
      await apiMarkCooked(recipe);
      await refresh();
    },
    [refresh],
  );

  return (
    <DataContext.Provider
      value={{
        data,
        loading,
        error,
        refresh,
        addRecipe,
        updateRecipe,
        setActive,
        markCooked,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
