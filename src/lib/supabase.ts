import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = createClient(
  supabaseUrl ?? 'https://example.supabase.co',
  supabasePublishableKey ?? 'public-anon-key',
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: localStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      // Google sign-in uses PKCE on every platform: the browser comes back
      // with a one-time `?code=` (no tokens in the URL or history) that only
      // this device can redeem, because the verifier stays in its storage.
      // AuthContext redeems it itself instead of detectSessionInUrl, so web
      // and native share one path, failures can be shown to the player, and
      // the code is removed from the address bar right away.
      flowType: 'pkce',
      detectSessionInUrl: false,
      lock: processLock
    }
  }
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
