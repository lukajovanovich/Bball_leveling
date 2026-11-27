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

-- Plans: which users have premium. Players can read their own row but never
-- write it; it is set from the Supabase dashboard (or later by a payment
-- webhook running with the service role). A missing row means free.
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_plans enable row level security;

create policy "Users can read their own plan"
on public.user_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

-- One row per AI training read, written only by the parse-training Edge
-- Function (service role) to enforce the daily limit. Players can read theirs.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_usage_user_created_idx
on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "Users can read their own AI usage"
on public.ai_usage
for select
to authenticated
using ((select auth.uid()) = user_id);
