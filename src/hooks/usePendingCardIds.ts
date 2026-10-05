import { useLiveQuery } from 'dexie-react-hooks';
import { listPendingIds } from '@/repositories/local/outboxRepo';

const EMPTY = new Set<string>();

/** Ids of cards with unsynced local changes (pending dot, SPEC §7.4). */
export function usePendingCardIds(): Set<string> {
  return useLiveQuery(() => listPendingIds('card'), []) ?? EMPTY;
}
