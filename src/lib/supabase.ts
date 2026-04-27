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
