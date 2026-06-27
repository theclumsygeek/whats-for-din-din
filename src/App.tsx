import { useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { ThemeToggle } from './components/ThemeToggle';
import { DataProvider, useData } from './state/DataProvider';
import { signOut } from './lib/supabase';
import { Tonight } from './screens/Tonight';
import { Recipes } from './screens/Recipes';

type Tab = 'tonight' | 'recipes';

export default function App() {
  return (
    <AuthGate>
      <DataProvider>
        <Main />
      </DataProvider>
    </AuthGate>
  );
}

function Main() {
  const [tab, setTab] = useState<Tab>('tonight');
  const { error, loading } = useData();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-earth-50/80 px-4 py-3 backdrop-blur dark:bg-ink/80">
        <h1 className="text-lg font-extrabold text-brand-800 dark:text-brand-200">
          🍲 What's for Din-Din?
        </h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full px-3 py-1 text-sm font-semibold text-ink-soft hover:bg-black/5 dark:text-earth-100 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <p className="mx-4 mt-2 rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <main className="flex-1 px-4 pb-28 pt-2">
        {tab === 'tonight' ? <Tonight /> : <Recipes />}
        {loading && (
          <p className="mt-4 text-center text-xs text-ink-soft dark:text-earth-100">
            Syncing…
          </p>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-earth-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-ink-soft dark:bg-ink/95">
        <TabButton active={tab === 'tonight'} onClick={() => setTab('tonight')} icon="🍽️" label="Tonight" />
        <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')} icon="📖" label="Recipes" />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
        active
          ? 'text-brand-600 dark:text-brand-300'
          : 'text-ink-soft dark:text-earth-100'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}
