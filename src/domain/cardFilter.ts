import { CARD_STATUSES, LIMITS } from './constants';
import { matchesSearch } from './search';
import type { CardFilter, CardStatus, LocalCard } from './types';

function isCardStatus(value: string | null): value is CardStatus {
  return CARD_STATUSES.some((status) => status === value);
}

function normalizeQuery(value: string | null | undefined): string {
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
