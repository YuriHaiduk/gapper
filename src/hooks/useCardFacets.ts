import { useLiveQuery } from 'dexie-react-hooks';
import type { CardFacets } from '@/domain/cardFilter';
import type { CardFilter } from '@/domain/types';
import { countCardFacets } from '@/repositories/local/cardsLocalRepo';

/** Live faceted counts for the filter sheet; `undefined` until the first read. */
export function useCardFacets(
  filter: CardFilter,
  categoryId: string | undefined,
): CardFacets | undefined {
  return useLiveQuery(() => countCardFacets(filter, categoryId), [filter, categoryId]);
}
