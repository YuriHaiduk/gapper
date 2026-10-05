import { supabaseRemote } from '@/repositories/remote';
import { createSyncService, type SyncService } from './syncService';

let service: SyncService | null = null;

/** App-wide sync service against Supabase; created lazily after env validation. */
export function getSyncService(): SyncService {
  service ??= createSyncService(supabaseRemote);
  return service;
}
