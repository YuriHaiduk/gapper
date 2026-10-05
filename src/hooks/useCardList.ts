import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { PAGE_SIZE } from '@/domain/constants';
import type { Card, CardFilter, Category } from '@/domain/types';
import { listCards } from '@/repositories/local/cardsLocalRepo';
import { readVisibleCount, writeVisibleCount } from './listSession';
import { useCategories } from './useCategories';

export type CardList = {
  /** Sorted categories (`Other` last); `undefined` until the first local read. */
  categories: Category[] | undefined;
  /** The category selected by `filter.categorySlug`, if it exists. */
  category: Category | undefined;
  categoryNotFound: boolean;
  /** Visible cards; `undefined` until the first local read. */
  cards: Card[] | undefined;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
};

/**
 * Growing window over the ordered local cards (SPEC §12): live-queries `visibleCount + 1`
 * matches. `visibleCount` survives Back via sessionStorage and resets when the filter changes.
 */
export function useCardList(filter: CardFilter, query: string): CardList {
  const categories = useCategories();
  const [windowState, setWindowState] = useState(() => ({
    query,
    count: readVisibleCount(query),
  }));
  let count = windowState.count;
  if (windowState.query !== query) {
    count = PAGE_SIZE;
    setWindowState({ query, count });
  }

  useEffect(() => {
    writeVisibleCount(query, count);
  }, [query, count]);

  const category = filter.categorySlug
    ? categories?.find((item) => item.slug === filter.categorySlug)
    : undefined;
  const categoryNotFound =
    categories !== undefined && filter.categorySlug !== undefined && category === undefined;
  const ready = categories !== undefined && !categoryNotFound;
  const categoryId = category?.id;
  const limit = count + 1;

  const result = useLiveQuery(
    async () =>
      ready ? { query, limit, cards: await listCards(filter, categoryId, limit) } : undefined,
    [ready, query, filter, categoryId, limit],
  );

  const loadMore = useCallback(() => {
    setWindowState((state) => ({ ...state, count: state.count + PAGE_SIZE }));
  }, []);

  const visible = result ? result.limit - 1 : 0;
  return {
    categories,
    category,
    categoryNotFound,
    cards: result?.cards.slice(0, visible),
    hasMore: result !== undefined && result.cards.length > visible,
    loadingMore: result !== undefined && result.query === query && result.limit !== limit,
    loadMore,
  };
}
