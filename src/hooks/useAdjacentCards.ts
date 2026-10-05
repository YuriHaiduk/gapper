import { useLiveQuery } from 'dexie-react-hooks';
import type { Card, CardFilter } from '@/domain/types';
import { getAdjacentCards, type AdjacentCards } from '@/repositories/local/cardsLocalRepo';
import { useCategories } from './useCategories';

/**
 * Live previous/next cards around `card` within the list context (SPEC §13);
 * `undefined` while loading
 * (also right after moving to another card). An unknown category slug yields no neighbours.
 */
export function useAdjacentCards(
  card: Pick<Card, 'id' | 'created_at'> | null | undefined,
  filter: CardFilter,
): AdjacentCards | undefined {
  const categories = useCategories();
  const categoryId = filter.categorySlug
    ? categories?.find((category) => category.slug === filter.categorySlug)?.id
    : undefined;
  const ready = categories !== undefined;
  const id = card?.id;
  const createdAt = card?.created_at;
  const result = useLiveQuery(
    async () =>
      ready && id !== undefined && createdAt !== undefined
        ? { id, ...(await getAdjacentCards({ id, created_at: createdAt }, filter, categoryId)) }
        : undefined,
    [ready, id, createdAt, filter, categoryId],
  );
  // The last result stays until the new query resolves; never expose another card's neighbours.
  return result?.id === id ? result : undefined;
}
