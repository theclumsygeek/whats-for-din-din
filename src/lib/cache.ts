import type { AppData } from './types';

const CACHE_KEY = 'wfdd:data:v1';
const THEME_KEY = 'wfdd:theme:v1';

/** Last-known data, for instant load + offline reads (stale-while-revalidate). */
export function loadCachedData(): AppData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (!Array.isArray(parsed.recipes) || !Array.isArray(parsed.cookLog)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedData(data: AppData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode — non-fatal, we just lose the cache */
  }
}

export type Theme = 'light' | 'dark';

export function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
