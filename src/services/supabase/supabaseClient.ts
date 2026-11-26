import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration check.
 * Only reads public Vite client environment variables (never service_role keys).
 */
export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseEnvConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured.',
    );
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}
