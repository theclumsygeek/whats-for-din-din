import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, signInWithPassword, supabase } from '../lib/supabase';
import { ThemeToggle } from './ThemeToggle';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <SetupNeeded />;
  if (!ready) return <Splash>Loading…</Splash>;
  if (!session) return <SignIn />;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <Shell>
      <p className="text-ink-soft dark:text-earth-100">{children}</p>
    </Shell>
  );
}

function Logo() {
  return (
    <div className="mb-6">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
        🍲
      </div>
      <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-200">
        What's for Din-Din
      </h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-earth-100">
        Your WFPB meal decider.
      </p>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      // On success, onAuthStateChange swaps in the app — nothing else to do.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not sign in. Check your details.',
      );
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <form onSubmit={submit} className="card space-y-3 p-6 text-left">
        <label className="block text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <label className="block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-xs text-ink-soft dark:text-earth-100">
          Accounts are created by the owner — there's no public sign-up.
        </p>
      </form>
    </Shell>
  );
}

function SetupNeeded() {
  return (
    <Shell>
      <Logo />
      <div className="card p-6 text-left text-sm">
        <p className="font-bold">Almost there 🛠️</p>
        <p className="mt-2 text-ink-soft dark:text-earth-100">
          Supabase isn't configured yet. Copy{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            .env.example
          </code>{' '}
          to{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            .env.local
          </code>{' '}
          and fill in your project URL and anon key (see the README).
        </p>
      </div>
    </Shell>
  );
}
