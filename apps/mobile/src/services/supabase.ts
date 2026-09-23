import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { env, isConfigured } from '../constants/env';
import { secureStorage } from './secureStorage';

/**
 * Mobile дотор зөвхөн SUPABASE_URL + ANON KEY байна.
 * SERVICE_ROLE_KEY-г энд ХЭЗЭЭ Ч бүү оруул — зөвхөн apps/api дээр.
 */
export const supabase = createClient(
  isConfigured ? env.supabaseUrl : 'https://not-configured.supabase.co',
  isConfigured ? env.supabaseAnonKey : 'not-configured',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// App идэвхтэй үед л token-ийг автоматаар шинэчилнэ (Supabase-ийн зөвлөмж)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
