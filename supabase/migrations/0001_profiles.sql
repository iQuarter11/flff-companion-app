-- Profiles: one row per authenticated user, keyed to auth.users.
-- Created automatically on signup via a trigger (see below) so the app
-- never has to handle a "missing profile" race after signup.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  display_name text,
  username text unique,
  espn_team_id integer,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  )
);

create index if not exists profiles_espn_team_id_idx on public.profiles (espn_team_id);

alter table public.profiles enable row level security;

-- League members can read each other's profiles (display name, avatar, team)
-- but only the owning user can modify their own row.
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_profiles_updated_at();

-- Auto-create a profile row whenever a new auth user is created, seeding
-- display_name from the email so the UI never shows a blank name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();
