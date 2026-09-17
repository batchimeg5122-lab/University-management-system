import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Frontend-д зөвхөн ANON key ашиглана.
 * SERVICE_ROLE_KEY-ийг хэзээ ч энд оруулж болохгүй.
 */
export const supabase: SupabaseClient | null =
  !env.useMock && env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;
