import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envResult } from './env';

let client: SupabaseClient | null = null;

/**
 * Lazily created Supabase client singleton. Only `auth/`, `sync/` and `repositories/remote/`
 * may import this. `App` renders the config error screen before anything can call it with
 * invalid env, so the throw is a programming-error guard.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!envResult.ok) throw new Error('Supabase is not configured');
  // Defaults: session persisted in localStorage with auto-refresh (SPEC §9).
  client = createClient(envResult.env.supabaseUrl, envResult.env.supabasePublishableKey);
  return client;
}
