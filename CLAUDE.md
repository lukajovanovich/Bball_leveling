# Bball Leveling

Mobile-first Expo (React Native) MVP: a real-life basketball progression app. Users log workouts, earn XP, complete quests, raise basketball attributes and grow their player OVR.

The owner communicates in Serbian; code, comments, UI copy and commit messages are in English.

## Commands

```bash
npm install
npm run start       # Expo dev server (also: npm run ios / android / web)
npm run typecheck   # tsc --noEmit
npm test            # Jest: logic, data, contexts, components and screens
npx jest __tests__/lib/progression.test.ts   # a single file
npx jest --coverage                           # coverage report
```

Run `npm run typecheck` and `npm test` before every commit. There is no linter configured.

## Tests

- Jest with the `jest-expo` preset and `@testing-library/react-native` v14. In v14 `render`, `fireEvent` and `renderHook` are async and must be awaited; read `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md` before writing component tests.
- Tests live in `__tests__/` (not in `app/`, where expo-router would treat them as routes) and must be named `*.test.ts(x)`. Shared helpers are in `__tests__/helpers/`.
- Nothing hits the network: `src/lib/supabase` is replaced with `__tests__/helpers/supabaseMock.ts` via `jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'))`. Use `mockControls` to set the stored session, the cloud row, and errors.
- `expo-router` and `localStorage` are stubbed globally in `jest.setup.ts`.
- Screen tests render the real providers through `renderApp` from `__tests__/helpers/renderApp.tsx`.
- New game rules or bug fixes need a test that fails without the change.

## Browser checks

UI changes are also checked in a real browser, following the `webapp-testing` skill in `.claude/skills/`:

- Run the app on web: `npm run web` (dev server, http://localhost:8081), or build once with `npx expo export -p web --output-dir <dir>` and serve that folder (single-page app: unknown paths must fall back to `index.html`).
- Without Supabase env vars the app opens in guest mode with the sample player, which is enough for most UI checks; Google sign-in shows as disabled.
- Drive it with Playwright (Python as in the skill, or Node's `require('playwright')` where Python Playwright is not installed), take screenshots at phone width (390 px) and check the browser console for errors.
- React Native Web scroll views: scroll the element itself (e.g. `getByTestId('measurement-wheel')`) or move the mouse over it before `mouse.wheel`.

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
- `src/theme/theme.ts` — `colors`, `fonts`, `spacing`, `radii`. Dark UI only.
- `src/types/index.ts` — all shared types.
- `supabase/schema.sql` — the full database schema.

## Things to know

- **Persistence model**: the whole `ProgressState` (player, quests, training sessions, activity log) is stored as one JSONB blob in `public.player_profiles.progress_state`, one row per user, protected by RLS (`auth.uid() = user_id`). There are no per-entity tables. `lastLevelUp` is UI-only and is always nulled before saving.
- **Changing the shape of `ProgressState` / `PlayerProfile`**: existing rows hold the old shape, so update `normalizePlayerProfile` / `normalizeProgressState` in `src/data/mockPlayer.ts` to fill in defaults for old data.
- **Schema changes** go in `supabase/schema.sql` and must be run manually in the Supabase SQL Editor — there are no migrations or CLI setup.
- **Measurements** are always stored in metric (`heightCm`, `wingspanCm`, `weightKg`) with a separate display unit field. Convert only at the display/input edge using `src/lib/measurements.ts`.
- **Signup flow**: the profile entered at signup is saved via `pendingSignup.ts` so it survives email confirmation, then turned into the first `player_profiles` row on first sign in.
- **Never save before the cloud row was read**: `ProgressContext` only upserts after it has loaded (or created) the signed-in user's row. If that load fails, local state is placeholder data and saving it would overwrite the user's real progress.
- **Error messages** shown to the user go through `describeError` in `src/lib/authErrors.ts`, which turns raw network failures ("Failed to fetch") into a readable message.
- **Missing env**: the app must still boot without Supabase env vars (`isSupabaseConfigured` is false, placeholder client, local-only state). Keep that path working.
- **Daily workout limit (free plan)**: each workout type once per local calendar day plus `DAILY_BONUS_WORKOUTS` repeats of any type. It is derived from `trainingSessions` timestamps by `getDailyWorkoutStatus` / `getWorkoutAvailability` in `progression.ts` (no extra stored state), enforced in `ProgressContext.logWorkout` (returns `null` when blocked) and shown on the Train screen. `trainingSessions` keeps the last 30, which must stay above the daily maximum.
- **Workouts and focus areas**: 8 workout types in `src/data/workouts.ts`, the last one the Pickup Game. Every type except the game has `focusOptions` (multi-select on the Train screen, stored as `TrainingSession.focus`, an optional list of ids). No focus = general session (each effect gets `max(1, floor(gainBase × weight))`). With focus, only the focus attributes move, at `FOCUS_GAIN_MULTIPLIER` × the base, trimmed so the session total never exceeds what the general session would give that player; focus effects must be a subset of the workout's effects. The game has no focus and uses `spreadGains` instead: that many +1s (light 6 / medium 8 / hard 10), at least one per category, going to the lowest ratings.
- **Rotating quests** (`src/lib/quests.ts`, numbers at the top of the file): every local day 3 daily quests (any workout incl. Pickup Game; one workout of the area of the day; one session of another area with a specific focus picked), every Monday 3 weekly quests. Areas are picked with a seeded random per player and day, weighted by archetype (`ARCHETYPE_AREA_WEIGHTS`), so every device shows the same quests. `ProgressState.questCycle` holds the day/week keys and the streak (kept while at least 1 daily quest a day is done; all 3 pay a streak bonus). `refreshQuests` runs on load, every minute/app foreground and before logging: it settles unfinished daily quests of past days (area quest: every rating of that area -1; focus quest: that rating -1; nothing done: -100 XP but never a level), at most `MAX_PENALIZED_DAYS` most recent days, then builds new quests. Rows without `questCycle` start fresh without penalties. The guest sample and the test fixture `newPlayerState` keep the fixed quests from `src/data/quests.ts`.
- **Fadeaway** (Shooting, shots off the dribble) was added after launch: rows without it get the rounded average of `midRangeShot` and `threePointShot` in `normalizeAttributes`, so old players keep their OVR.
- Attributes are clamped to 0–99 (`ATTRIBUTE_MIN` / `ATTRIBUTE_MAX`). Game-balance numbers (XP per level, intensity multipliers, workout effect weights) live in `src/lib/progression.ts` and `src/data/workouts.ts` — keep them there, not inline in screens.

## Conventions

- Styling with `StyleSheet.create` at the bottom of each file, using tokens from `src/theme/theme.ts` instead of hard-coded colors/spacing.
- Named exports for components, hooks and helpers; default exports only for route files in `app/`.
- Relative imports (no path aliases). 2-space indent, single quotes, semicolons, no trailing commas.
- Keep game logic in `src/lib` as pure functions; screens and contexts call into it.

## Design rules

UI work follows the `frontend-design` skill in `.claude/skills/`. For this app that means:

- Fonts: Barlow Condensed (`fonts.display`, `fonts.displayBold`) for numbers, ratings and headings; Barlow (`fonts.body*`) for reading text. Loaded in `app/_layout.tsx`. Always set `fontFamily` from `fonts`, never `fontWeight` (custom fonts ignore it on Android).
- Color: court orange (`colors.court`) for actions and selection, gold (`colors.gold`) only for XP, levels and rewards. Category hues only label attribute groups and workouts. Success and red are for status.
- No gradients, glow blobs, drop shadows, all-caps labels, eyebrow labels above titles, or `A · B` meta strings. Prefer hairlines and flat panels over boxed cards.
- The OVR card is the one bold element; keep everything around it quiet.
- Copy in sentence case, plain verbs, written for the player (no "Supabase", "build check" or marketing lines).

## Environment

`.env` (git-ignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`. Never commit `.env`. Only the publishable key belongs in the app — never a service role key.

## Git workflow

- Remote: https://github.com/lukajovanovich/Bball_leveling
- `dev` is the working branch: all work is committed and pushed there. Once typecheck and tests pass, finished work may be committed and pushed to `dev` without asking; the owner tests it there (Vercel preview of `dev`, or locally) before it goes to `main`.
- `main` is the stable branch: it only receives changes from `dev` after the owner confirms everything works. Never commit or push directly to `main`, and never merge into it without being asked.
- Merging into `main` happens only when the owner asks.
- **No AI attribution anywhere**: no `Co-Authored-By` lines, no "Generated with Claude Code" footers, no mention of Claude or AI in commit messages, PR descriptions, code comments or docs. The owner is the sole author.
- Short imperative English commit messages.
