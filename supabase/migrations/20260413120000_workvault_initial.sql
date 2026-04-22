-- =============================================================================
-- WorkVault — full Supabase / PostgreSQL setup
-- =============================================================================
-- Run once on a new Supabase project:
--   • SQL Editor → paste → Run, or
--   • supabase link && supabase db push
--
-- Includes: enums, tables, updated_at triggers, auth signup trigger, RLS,
--           table grants, Storage bucket "avatars" + object policies.
-- Does not include: Edge Functions, RPCs, or AI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. Enum types
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('freelancer', 'client', 'admin');

create type public.project_status as enum (
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'on_hold',
  'canceled'
);

-- -----------------------------------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role public.user_role not null default 'freelancer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.freelancer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text not null default '',
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  location text not null default '',
  hourly_rate integer not null default 0 check (hourly_rate >= 0),
  designation text,
  tagline text,
  years_exp text,
  projects_count text,
  rating_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text not null default '',
  location text not null default '',
  designation text,
  total_investment text,
  projects_posted text,
  network_rating text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text not null,
  link text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_items_freelancer_id_idx on public.portfolio_items (freelancer_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid references public.profiles (id) on delete set null,
  client_id uuid references public.profiles (id) on delete set null,
  title text not null,
  description text not null default '',
  status public.project_status not null default 'pending',
  deadline text,
  budget integer check (budget is null or budget >= 0),
  start_date text,
  progress smallint check (progress is null or (progress >= 0 and progress <= 100)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_participant_chk check (freelancer_id is not null or client_id is not null)
);

create index projects_freelancer_id_idx on public.projects (freelancer_id);
create index projects_client_id_idx on public.projects (client_id);

create table public.clients_list (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_list_freelancer_id_idx on public.clients_list (freelancer_id);

-- -----------------------------------------------------------------------------
-- 4. Functions: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists freelancer_profiles_set_updated_at on public.freelancer_profiles;
create trigger freelancer_profiles_set_updated_at
  before update on public.freelancer_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
  before update on public.client_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists portfolio_items_set_updated_at on public.portfolio_items;
create trigger portfolio_items_set_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists clients_list_set_updated_at on public.clients_list;
create trigger clients_list_set_updated_at
  before update on public.clients_list
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Function: RLS helper (readable by API roles for policy evaluation)
-- -----------------------------------------------------------------------------
create or replace function public.is_freelancer(uid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'freelancer'
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. Auth: create profile (+ role table) on new user
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  parsed_role public.user_role;
begin
  r := coalesce(new.raw_user_meta_data ->> 'role', 'freelancer');
  begin
    parsed_role := r::public.user_role;
  exception
    when invalid_text_representation then
      parsed_role := 'freelancer';
  end;

  insert into public.profiles (id, name, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    parsed_role,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      'https://i.pravatar.cc/150?u=' || new.id::text
    )
  );

  if parsed_role = 'freelancer' then
    insert into public.freelancer_profiles (user_id) values (new.id);
  elsif parsed_role = 'client' then
    insert into public.client_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.freelancer_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.projects enable row level security;
alter table public.clients_list enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_select_freelancers_public on public.profiles;
create policy profiles_select_freelancers_public
  on public.profiles for select
  using (role = 'freelancer');

-- freelancer_profiles
drop policy if exists freelancer_profiles_select_own on public.freelancer_profiles;
create policy freelancer_profiles_select_own
  on public.freelancer_profiles for select
  using (auth.uid() = user_id);

drop policy if exists freelancer_profiles_select_public_freelancer on public.freelancer_profiles;
create policy freelancer_profiles_select_public_freelancer
  on public.freelancer_profiles for select
  using (public.is_freelancer(user_id));

drop policy if exists freelancer_profiles_update_own on public.freelancer_profiles;
create policy freelancer_profiles_update_own
  on public.freelancer_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists freelancer_profiles_insert_own on public.freelancer_profiles;
create policy freelancer_profiles_insert_own
  on public.freelancer_profiles for insert
  with check (auth.uid() = user_id);

-- client_profiles
drop policy if exists client_profiles_all_own on public.client_profiles;
create policy client_profiles_all_own
  on public.client_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- portfolio_items
drop policy if exists portfolio_items_owner_all on public.portfolio_items;
create policy portfolio_items_owner_all
  on public.portfolio_items for all
  using (auth.uid() = freelancer_id)
  with check (auth.uid() = freelancer_id);

drop policy if exists portfolio_items_select_public_freelancer on public.portfolio_items;
create policy portfolio_items_select_public_freelancer
  on public.portfolio_items for select
  using (public.is_freelancer(freelancer_id));

-- projects
drop policy if exists projects_select_participant on public.projects;
create policy projects_select_participant
  on public.projects for select
  using (auth.uid() = freelancer_id or auth.uid() = client_id);

drop policy if exists projects_insert_as_participant on public.projects;
create policy projects_insert_as_participant
  on public.projects for insert
  with check (auth.uid() = freelancer_id or auth.uid() = client_id);

drop policy if exists projects_update_participant on public.projects;
create policy projects_update_participant
  on public.projects for update
  using (auth.uid() = freelancer_id or auth.uid() = client_id)
  with check (auth.uid() = freelancer_id or auth.uid() = client_id);

drop policy if exists projects_delete_participant on public.projects;
create policy projects_delete_participant
  on public.projects for delete
  using (auth.uid() = freelancer_id or auth.uid() = client_id);

-- clients_list
drop policy if exists clients_list_freelancer_all on public.clients_list;
create policy clients_list_freelancer_all
  on public.clients_list for all
  using (auth.uid() = freelancer_id)
  with check (auth.uid() = freelancer_id);

-- -----------------------------------------------------------------------------
-- 8. Grants — PostgREST / Supabase client (RLS still applies)
-- -----------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select on public.profiles to anon;

grant select, insert, update, delete on public.freelancer_profiles to authenticated, service_role;
grant select on public.freelancer_profiles to anon;

grant select, insert, update, delete on public.client_profiles to authenticated, service_role;

grant select, insert, update, delete on public.portfolio_items to authenticated, service_role;
grant select on public.portfolio_items to anon;

grant select, insert, update, delete on public.projects to authenticated, service_role;

grant select, insert, update, delete on public.clients_list to authenticated, service_role;

grant execute on function public.is_freelancer(uuid) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9. Storage: avatars bucket + policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read objects in public bucket (object URLs are still unguessable)
drop policy if exists "workvault_avatars_public_read" on storage.objects;
create policy "workvault_avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Authenticated users: upload only into folder named with their user id
drop policy if exists "workvault_avatars_insert_own" on storage.objects;
create policy "workvault_avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists "workvault_avatars_update_own" on storage.objects;
create policy "workvault_avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists "workvault_avatars_delete_own" on storage.objects;
create policy "workvault_avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

-- =============================================================================
-- Done. Next: signUp with options.data = { name, role: 'freelancer'|'client' }
-- Upload paths: object key = "<user_uuid>/<filename>" under bucket avatars
-- =============================================================================
