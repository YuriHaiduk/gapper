import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { countAll, countFailed } from '@/repositories/local/outboxRepo';
import { getMeta, setMeta } from '@/repositories/local/metaRepo';
import { SyncContext, type SyncState } from './syncContext';
import type { SyncResult, SyncService } from './syncService';

/** Delay after the last local write before syncing (SPEC §15.1). */
export const WRITE_SYNC_DELAY_MS = 2000;

type SyncProviderProps = { service: SyncService; children: ReactNode };

/**
 * Runs sync while signed in. Triggers: sign-in / app start, `online`, tab becoming
 * visible, and 2 s after the outbox grows. Periodic sync comes with step 10.
 */
export function SyncProvider({ service, children }: SyncProviderProps) {
  const { status, user } = useAuth();
  const signedIn = status === 'signed_in';
  const userId = user?.id ?? null;
  const [runs, setRuns] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const pendingCount = useLiveQuery(countAll, [], 0);
  const failedCount = useLiveQuery(countFailed, [], 0);
  const lastSyncAt = useLiveQuery(() => getMeta('last_sync_at'), []) ?? null;
  const initialSyncDone = useLiveQuery(() => getMeta('initial_sync_done'), []) ?? false;

  const syncNow = useCallback(async () => {
    // Counter, not a flag: overlapping calls share runs but resolve at different times.
    setRuns((n) => n + 1);
    try {
      const result = await service.sync();
      setLastResult(result);
      return result;
    } finally {
      setRuns((n) => n - 1);
    }
  }, [service]);

  const autoSync = useCallback(() => {
    if (navigator.onLine) void syncNow();
  }, [syncNow]);

  // Start: remember the owner of the local data, then sync.
  useEffect(() => {
    if (!userId) return;
    void setMeta('user_id', userId).then(autoSync);
  }, [userId, autoSync]);

  useEffect(() => {
    if (!signedIn) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') autoSync();
    };
    window.addEventListener('online', autoSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', autoSync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [signedIn, autoSync]);

  // Debounced sync after local writes (outbox grew).
  const previousPending = useRef(pendingCount);
  useEffect(() => {
    const grew = pendingCount > previousPending.current;
    previousPending.current = pendingCount;
    if (!signedIn || !grew) return;
    const timer = setTimeout(autoSync, WRITE_SYNC_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [pendingCount, signedIn, autoSync]);

  const syncing = runs > 0;
  const value = useMemo<SyncState>(
    () => ({
      syncing,
      lastResult,
      lastSyncAt,
      initialSyncDone,
      pendingCount,
      failedCount,
      syncNow,
    }),
    [syncing, lastResult, lastSyncAt, initialSyncDone, pendingCount, failedCount, syncNow],
  );
  return <SyncContext value={value}>{children}</SyncContext>;
}
