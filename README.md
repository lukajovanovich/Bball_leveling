# Bball Leveling

A mobile-first Expo MVP for a real-life basketball progression app. Users log workouts, earn XP, complete quests, improve basketball attributes, and grow their player OVR.

## Run

```bash
npm install
npm run start
```

Use `npm run ios`, `npm run android`, or `npm run web` for a specific platform.

## Supabase Setup

1. Copy `.env.example` to `.env` and fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

2. In Supabase SQL Editor, run [supabase/schema.sql](./supabase/schema.sql).
3. In Supabase Auth settings, use Email auth.
4. If you want instant signup in the app without email confirmation, disable email confirmation for this MVP. If confirmation stays on, signup still works, but the user must confirm the email before the first real sign in.

The app now stores each user's player progress in `public.player_profiles`, including profile data, attributes, quests, training sessions, and activity history.
