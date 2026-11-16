# Bball Leveling

Mobile-first Expo (React Native) MVP: a real-life basketball progression app. Users log workouts, earn XP, complete quests, raise basketball attributes and grow their player OVR.

The owner communicates in Serbian; code, comments, UI copy and commit messages are in English.

## Commands

```bash
npm install
npm run start       # Expo dev server (also: npm run ios / android / web)
npm run typecheck   # tsc --noEmit — the only automated check; run it before every commit
```

There is no test runner and no linter configured.

## Stack

- Expo + expo-router (typed routes, new architecture enabled), React 19, React Native 0.83, TypeScript strict
- Supabase (email auth + Postgres) via `@supabase/supabase-js`
- `expo-sqlite/localStorage` as the `localStorage` polyfill on native (auth session, pending signup profile)
- No state library: two React contexts

## Layout

- `app/` — routes. `index.tsx` is the sign in / sign up + player creation screen; `(tabs)/` holds `home`, `attributes` (tab label "Build"), `train`, `quests`, `profile`. `_layout.tsx` wraps everything in `AuthProvider` > `ProgressProvider` and mounts `LevelUpModal`.
- `src/store/` — `AuthContext` (session, signIn/signUp/signOut) and `ProgressContext` (player state, `logWorkout`, `updateProfile`, `createNewProfile`, cloud sync).
- `src/lib/` — pure logic: `progression.ts` (XP, levels, OVR, workout → attribute gains, quest progress), `measurements.ts` (cm/in, kg/lb conversion and picker options), `playerProfileStore.ts` (Supabase read/upsert), `supabase.ts` (client), `pendingSignup.ts`, `playerIdentity.ts`.
- `src/data/` — static definitions: attribute categories, workouts, quests, positions/archetypes, plus player/state factories and normalizers in `mockPlayer.ts`.
- `src/components/` — `ui/` (generic), `player/`, `training/`.
- `src/theme/theme.ts` — `colors`, `spacing`, `radii`, `shadows`. Dark UI only.
- `src/types/index.ts` — all shared types.
- `supabase/schema.sql` — the full database schema.

## Things to know

- **Persistence model**: the whole `ProgressState` (player, quests, training sessions, activity log) is stored as one JSONB blob in `public.player_profiles.progress_state`, one row per user, protected by RLS (`auth.uid() = user_id`). There are no per-entity tables. `lastLevelUp` is UI-only and is always nulled before saving.
- **Changing the shape of `ProgressState` / `PlayerProfile`**: existing rows hold the old shape, so update `normalizePlayerProfile` / `normalizeProgressState` in `src/data/mockPlayer.ts` to fill in defaults for old data.
- **Schema changes** go in `supabase/schema.sql` and must be run manually in the Supabase SQL Editor — there are no migrations or CLI setup.
- **Measurements** are always stored in metric (`heightCm`, `wingspanCm`, `weightKg`) with a separate display unit field. Convert only at the display/input edge using `src/lib/measurements.ts`.
- **Signup flow**: the profile entered at signup is saved via `pendingSignup.ts` so it survives email confirmation, then turned into the first `player_profiles` row on first sign in.
- **Missing env**: the app must still boot without Supabase env vars (`isSupabaseConfigured` is false, placeholder client, local-only state). Keep that path working.
- Attributes are clamped to 0–99 (`ATTRIBUTE_MIN` / `ATTRIBUTE_MAX`). Game-balance numbers (XP per level, intensity multipliers, workout effect weights) live in `src/lib/progression.ts` and `src/data/workouts.ts` — keep them there, not inline in screens.

## Conventions

- Styling with `StyleSheet.create` at the bottom of each file, using tokens from `src/theme/theme.ts` instead of hard-coded colors/spacing.
- Named exports for components, hooks and helpers; default exports only for route files in `app/`.
- Relative imports (no path aliases). 2-space indent, single quotes, semicolons, no trailing commas.
- Keep game logic in `src/lib` as pure functions; screens and contexts call into it.

## Environment

`.env` (git-ignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`. Never commit `.env`. Only the publishable key belongs in the app — never a service role key.

## Git workflow

- Remote: https://github.com/lukajovanovich/Bball_leveling
- `dev` is the working branch: all work is committed and pushed there.
- `main` is the stable branch: it only receives changes from `dev` after the owner confirms everything works. Never commit or push directly to `main`, and never merge into it without being asked.
- Commit, push and merge only when the owner asks.
- **No AI attribution anywhere**: no `Co-Authored-By` lines, no "Generated with Claude Code" footers, no mention of Claude or AI in commit messages, PR descriptions, code comments or docs. The owner is the sole author.
- Short imperative English commit messages.
