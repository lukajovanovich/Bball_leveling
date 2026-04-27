create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  progress_state jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.player_profiles enable row level security;

create policy "Users can read their own player profile"
on public.player_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own player profile"
on public.player_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own player profile"
on public.player_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
