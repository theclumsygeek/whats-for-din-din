// Local backup: dumps every row of `recipes` and `cook_log` to a timestamped
// JSON file under backups/. Run with `npm run backup`.
//
// Reads two values from .env.local:
//   VITE_SUPABASE_URL    (already there for the app)
//   SUPABASE_SECRET_KEY  (add this — Supabase dashboard -> Settings -> API Keys,
//                         create a Secret API key, looks like sb_secret_...)
//
// A Secret API key bypasses Row-Level Security so the script can read all rows.
// Prefer it over the legacy service_role JWT: if it ever leaks you just revoke
// that one key instead of rotating the project's JWT secret. (The legacy
// SUPABASE_SERVICE_ROLE_KEY still works as a fallback if that's what you have.)
// It is NOT prefixed with VITE_, so Vite never bundles it into the client.
// Keep it only in .env.local (git-ignored). Treat it like a password.

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

// --- tiny .env.local loader (no dotenv dependency) ---
const env = {};
try {
  const text = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  console.error('Could not read .env.local — run this from the project root.');
  process.exit(1);
}

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.',
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const tables = ['recipes', 'cook_log'];
const dump = { exportedAt: new Date().toISOString() };
for (const t of tables) {
  const { data, error } = await supabase.from(t).select('*');
  if (error) {
    console.error(`Failed to read ${t}: ${error.message}`);
    process.exit(1);
  }
  dump[t] = data;
  console.log(`  ${t}: ${data.length} rows`);
}

const dir = new URL('../backups/', import.meta.url);
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = new URL(`dindin-${stamp}.json`, dir);
await writeFile(file, JSON.stringify(dump, null, 2));
console.log(`Wrote ${file.pathname.slice(1)}`);
