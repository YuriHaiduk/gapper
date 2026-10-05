import { CARD_STATUSES, LIMITS } from './constants';
import { matchesSearch } from './search';
import type { CardFilter, CardStatus, LocalCard } from './types';

function isCardStatus(value: string | null): value is CardStatus {
  return CARD_STATUSES.some((status) => status === value);
}

export function normalizeQuery(value: string | null | undefined): string {
  return (value ?? '').trim().slice(0, LIMITS.query).trim();
}

/** Reads list context from the URL (SPEC §11.1). Invalid or empty values are dropped. */
export function parseCardFilter(params: URLSearchParams): CardFilter {
  const filter: CardFilter = {};
  const status = params.get('status');
  if (isCardStatus(status)) filter.status = status;
  const category = params.get('category')?.trim();
  if (category) filter.categorySlug = category;
  const q = normalizeQuery(params.get('q'));
  if (q) filter.q = q;
  return filter;
}

/** Canonical query string without `?`: params in order status, category, q. */
export function serializeCardFilter(filter: CardFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.categorySlug) params.set('category', filter.categorySlug);
  const q = normalizeQuery(filter.q);
  if (q) params.set('q', q);
  return params.toString();
}

/**
 * Shared predicate for the list and prev/next (SPEC §12, §13).
 * `categoryId` is the id resolved from `filter.categorySlug` by the caller.
 */
export function matchesCardFilter(
  card: LocalCard,
  filter: CardFilter,
  categoryId?: string,
): boolean {
  if (card.deleted_at !== null) return false;
  if (filter.status && card.status !== filter.status) return false;
  if (filter.categorySlug && card.category_id !== categoryId) return false;
  if (filter.q && !matchesSearch(card._search, filter.q)) return false;
  return true;
}

const STATUS_LABELS: Record<CardStatus, string> = { learning: 'Learning', learned: 'Learned' };

export function statusLabel(status: CardStatus): string {
  return STATUS_LABELS[status];
}

/** Header filter button text (SPEC §11.2): `All cards`, `Learning`, `Learning · Law`, `Law`. */
export function filterLabel(filter: CardFilter, categoryName?: string): string {
  const parts: string[] = [];
  if (filter.status) parts.push(STATUS_LABELS[filter.status]);
  if (filter.categorySlug) parts.push(categoryName ?? filter.categorySlug);
  return parts.length > 0 ? parts.join(' · ') : 'All cards';
}

/** Empty list message for the active context (SPEC §25); search wins, then category, then status. */
export function emptyListMessage(filter: CardFilter): string {
  if (filter.q) return `No cards match “${filter.q}”.`;
  if (filter.categorySlug) return 'No cards in this category.';
  if (filter.status === 'learning') return 'No learning cards yet.';
  if (filter.status === 'learned') return 'No learned cards yet.';
  return 'No cards yet.';
}

export type CardFacets = {
  /** Counts per status option, with the selected category and search applied. */
  byStatus: { all: number; learning: number; learned: number };
  /** Counts per category id, with the selected status and search applied. */
  byCategory: Record<string, number>;
  /** "All categories" option count. */
  allCategories: number;
};

/** Faceted filter-sheet counts in one pass (SPEC §11.2, D34). */
export function countFacets(
  cards: Iterable<LocalCard>,
  filter: CardFilter,
  categoryId?: string,
): CardFacets {
  const facets: CardFacets = {
    byStatus: { all: 0, learning: 0, learned: 0 },
    byCategory: {},
    allCategories: 0,
  };
  const withoutStatus: CardFilter = { ...filter };
  delete withoutStatus.status;
  const withoutCategory: CardFilter = { ...filter };
  delete withoutCategory.categorySlug;
  for (const card of cards) {
    if (matchesCardFilter(card, withoutStatus, categoryId)) {
      facets.byStatus.all += 1;
      facets.byStatus[card.status] += 1;
    }
    if (matchesCardFilter(card, withoutCategory)) {
      facets.allCategories += 1;
      facets.byCategory[card.category_id] = (facets.byCategory[card.category_id] ?? 0) + 1;
    }
  }
  return facets;
}
