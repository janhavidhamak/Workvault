-- Add metadata fields used by the UI to portfolio_items.
-- Safe to run after initial schema is created.

alter table public.portfolio_items
  add column if not exists category text,
  add column if not exists year text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb;

