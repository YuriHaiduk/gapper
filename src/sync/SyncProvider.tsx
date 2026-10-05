import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { wipeLocalData } from '@/db/database';
import { PERIODIC_SYNC_MS } from '@/domain/constants';
import { countAll, countFailed, rearm } from '@/repositories/local/outboxRepo';
import { getMeta, setMeta } from '@/repositories/local/metaRepo';
import { SyncContext, type SyncState } from './syncContext';
import type { SyncResult, SyncService } from './syncService';

/** Delay after the last local write before syncing (SPEC §15.1). */
export const WRITE_SYNC_DELAY_MS = 2000;

type SyncProviderProps = {
  service: SyncService;
  /** Overridable for tests. */
  periodMs?: number;
  children: ReactNode;
};

/**
 * Runs sync while signed in. Triggers (SPEC §15.1): sign-in / app start, `online`, tab
 * becoming visible, 2 s after the outbox grows, and every 5 min while visible and online.
 */
export function SyncProvider({
  service,
  periodMs = PERIODIC_SYNC_MS,
  children,
}: SyncProviderProps) {
  const { status, user } = useAuth();
  const signedIn = status === 'signed_in';
  const userId = signedIn ? user.id : null;
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

  // Start: local data of another user is wiped first (SPEC §9, D51), then sync.
  useEffect(() => {
    if (!userId) return;
    const effect = { cancelled: false };
    void (async () => {
      const owner = await getMeta('user_id');
      if (owner !== undefined && owner !== userId) {
        await service.whenIdle();
        await wipeLocalData();
      }
      await setMeta('user_id', userId);
      if (!effect.cancelled) autoSync();
    })();
    return () => {
      effect.cancelled = true;
    };
  }, [userId, service, autoSync]);

  useEffect(() => {
    if (!signedIn) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') autoSync();
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') autoSync();
    }, periodMs);
    window.addEventListener('online', autoSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', autoSync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [signedIn, autoSync, periodMs]);

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

  const retryFailed = useCallback(
    async (entryIds: number[]) => {
      await Promise.all(entryIds.map(rearm));
      autoSync();
    },
    [autoSync],
  );

  const resetLocalData = useCallback(async () => {
    await service.whenIdle();
    await wipeLocalData();
    setLastResult(null);
  }, [service]);

  const syncing = runs > 0;
  const sessionExpired = status === 'expired' || (signedIn && lastResult?.status === 'auth_error');
  const value = useMemo<SyncState>(
    () => ({
      syncing,
      lastResult,
      lastSyncAt,
      initialSyncDone,
      pendingCount,
      failedCount,
      sessionExpired,
      syncNow,
      retryFailed,
      discardFailed: service.discard,
      resetLocalData,
      downloadAudio: service.downloadAudio,
    }),
    [
      syncing,
      lastResult,
      lastSyncAt,
      initialSyncDone,
      pendingCount,
      failedCount,
      sessionExpired,
      syncNow,
      retryFailed,
      service.discard,
      resetLocalData,
      service.downloadAudio,
    ],
  );
  return <SyncContext value={value}>{children}</SyncContext>;
}
