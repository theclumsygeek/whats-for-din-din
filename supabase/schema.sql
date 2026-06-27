-- What's for Din-Din — Supabase schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.recipes (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  source_url       text,
  grain            text not null default 'other',
  main_ingredients text[] not null default '{}',
  effort           text not null default 'medium',
  notes            text,
  active           boolean not null default true,
  last_cooked_date date,
  times_cooked     integer not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.cook_log (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  date       date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists cook_log_recipe_id_idx on public.cook_log(recipe_id);
create index if not exists cook_log_date_idx on public.cook_log(date);

-- ---------------------------------------------------------------------------
-- Row-Level Security: only authenticated users (our two invited accounts) may
-- read or write. The anon key shipped in the frontend can do nothing on its own.
-- ---------------------------------------------------------------------------

alter table public.recipes enable row level security;
alter table public.cook_log enable row level security;

drop policy if exists "authenticated full access" on public.recipes;
create policy "authenticated full access" on public.recipes
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.cook_log;
create policy "authenticated full access" on public.cook_log
  for all to authenticated using (true) with check (true);
