-- ============================================================================
-- DAYFORM — Complete Supabase PostgreSQL Schema, Triggers, Storage & RLS
-- Paste this entire script into the Supabase SQL Editor and click "Run".
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#C18C64',
  created_at timestamptz not null default now()
);

create index if not exists categories_user_idx on public.categories(user_id);

-- TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category_id uuid references public.categories(id) on delete set null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekdays', 'weekly', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_completed_idx on public.tasks(user_id, is_completed);
create index if not exists tasks_category_idx on public.tasks(category_id);

-- SUBTASKS
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists subtasks_task_idx on public.subtasks(task_id);
create index if not exists subtasks_user_idx on public.subtasks(user_id);

-- USER PREFERENCES
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  notifications_enabled boolean not null default true,
  due_date_reminders boolean not null default true,
  daily_digest boolean not null default false,
  week_starts_on text not null default 'monday' check (week_starts_on in ('sunday', 'monday')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. AUTO-PROVISION PROFILE & PREFERENCES ON AUTH SIGNUP
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_name text;
begin
  default_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'User'), '@', 1)
  );

  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    default_name,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, color)
  values
    (new.id, 'Work', '#C18C64'),
    (new.id, 'Personal', '#648B72');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.user_preferences enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- CATEGORIES POLICIES
drop policy if exists "Users can manage their own categories" on public.categories;
create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TASKS POLICIES
drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SUBTASKS POLICIES
drop policy if exists "Users can manage their own subtasks" on public.subtasks;
create policy "Users can manage their own subtasks"
  on public.subtasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- USER PREFERENCES POLICIES
drop policy if exists "Users can manage their own preferences" on public.user_preferences;
create policy "Users can manage their own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. STORAGE BUCKET & POLICIES FOR PROFILE AVATARS
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
