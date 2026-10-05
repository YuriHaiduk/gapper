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
  syncNow: () => Promise<SyncResult>;
  /** Downloads and caches a recording (SPEC §10.4, D47). */
  downloadAudio: (path: string, cardId: string) => Promise<Blob>;
};

export const SyncContext = createContext<SyncState | null>(null);
