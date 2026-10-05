import { createContext } from 'react';
import type { SyncResult } from './syncService';

export type SyncState = {
  syncing: boolean;
  /** Result of the latest finished run in this session (null before the first). */
  lastResult: SyncResult | null;
  lastSyncAt: string | null;
  initialSyncDone: boolean;
  /** Outbox entries not yet pushed, failed ones included. */
  pendingCount: number;
  failedCount: number;
  /** The session expired or the API rejected it: sync is paused until sign-in (D50). */
  sessionExpired: boolean;
  syncNow: () => Promise<SyncResult>;
  /** Re-arms failed outbox entries and syncs (SPEC §15.2). */
  retryFailed: (entryIds: number[]) => Promise<void>;
  /** Drops a failed entry and restores the server's row (D53); rejects when offline. */
  discardFailed: (entryId: number) => Promise<void>;
  /** Waits for a running sync, then empties the local database (sign-out, D49). */
  resetLocalData: () => Promise<void>;
  /** Downloads and caches a recording (SPEC §10.4, D47). */
  downloadAudio: (path: string, cardId: string) => Promise<Blob>;
};

export const SyncContext = createContext<SyncState | null>(null);
