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

-- Test upgrades: until real payments exist, players can switch themselves
-- between free and premium from Profile, but only while this switch is on.
-- Turn it off before launch:
--   update public.app_settings set test_upgrades_enabled = false where id = 1;
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  test_upgrades_enabled boolean not null default true
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- No policies: only the dashboard and the function below can read it.
alter table public.app_settings enable row level security;

create or replace function public.set_test_plan(new_plan text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if new_plan not in ('free', 'premium') then
    raise exception 'unknown_plan';
  end if;

  if not coalesce((select test_upgrades_enabled from public.app_settings where id = 1), false) then
    raise exception 'test_upgrades_disabled';
  end if;

  insert into public.user_plans (user_id, plan, updated_at)
  values (auth.uid(), new_plan, timezone('utc', now()))
  on conflict (user_id) do update
    set plan = excluded.plan, updated_at = excluded.updated_at;

  return new_plan;
end;
$$;

revoke all on function public.set_test_plan(text) from public;
grant execute on function public.set_test_plan(text) to authenticated;
