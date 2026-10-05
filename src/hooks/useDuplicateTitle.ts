import { useLiveQuery } from 'dexie-react-hooks';
import { useDeferredValue } from 'react';
import type { Card } from '@/domain/types';
import { findCardsByTitle } from '@/repositories/local/cardsLocalRepo';

/** An existing card with the same title (non-blocking hint, SPEC §7.1), excluding `selfId`. */
export function useDuplicateTitle(title: string, selfId?: string): Card | undefined {
  const deferred = useDeferredValue(title);
  return useLiveQuery(
    async () => (await findCardsByTitle(deferred, selfId))[0],
    [deferred, selfId],
  );
}
