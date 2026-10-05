import { useLiveQuery } from 'dexie-react-hooks';
import type { Card } from '@/domain/types';
import { getCard } from '@/repositories/local/cardsLocalRepo';

/** Live card by id: `undefined` while loading, `null` when missing or deleted. */
export function useCard(id: string | undefined): Card | null | undefined {
  return useLiveQuery(async () => {
    const card = id ? await getCard(id) : undefined;
    return card && card.deleted_at === null ? card : null;
  }, [id]);
}
