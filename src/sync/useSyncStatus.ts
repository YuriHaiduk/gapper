import { use } from 'react';
import { SyncContext, type SyncState } from './syncContext';

export function useSyncStatus(): SyncState {
  const value = use(SyncContext);
  if (!value) throw new Error('useSyncStatus must be used inside <SyncProvider>');
  return value;
}
