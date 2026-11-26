import type { DayformServices } from './contracts';
import { createLocalServices } from './local/localServices';
import { isSupabaseConfigured } from './supabase/supabaseClient';
import { createSupabaseServices } from './supabase/supabaseServices';

let cachedServices: DayformServices | null = null;

/**
 * Resolves the active service provider.
 * Uses local persistence cleanly separated from the Supabase adapter whenever
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured.
 */
export function getServices(): DayformServices {
  if (!cachedServices) {
    cachedServices = isSupabaseConfigured()
      ? createSupabaseServices()
      : createLocalServices();
  }
  return cachedServices;
}

export const services = getServices();
