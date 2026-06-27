-- Migration: rename recipes.grain -> recipes.base
-- Run once in the Supabase dashboard (SQL Editor) against an existing database
-- that was created before the column was renamed. Safe to skip on a fresh DB
-- created from the current schema.sql (which already uses `base`).

alter table public.recipes rename column grain to base;
