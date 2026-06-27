import { useEffect, useState } from 'react';
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/cache';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="rounded-full p-2 text-xl transition hover:bg-black/5 dark:hover:bg-white/10"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
