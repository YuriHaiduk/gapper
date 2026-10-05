import { richTextToPlain } from './richText';
import type { Card } from './types';

/** Lowercase, diacritic-free, single-spaced text (SPEC §11.3). */
export function normalizeText(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/gu, ' ').trim();
}

type SearchableCard = Pick<Card, 'title' | 'notes'>;

/** Derived `_search` value stored on every local card row: title + notes text. */
export function buildSearchText(card: SearchableCard): string {
  return normalizeText(`${card.title} ${richTextToPlain(card.notes)}`);
}

/** Every word of the query must occur somewhere in the search text (AND). */
export function matchesSearch(searchText: string, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  return words.every((word) => searchText.includes(word));
}
