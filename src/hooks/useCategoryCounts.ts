import { useLiveQuery } from 'dexie-react-hooks';
import { countCardsByCategory } from '@/repositories/local/cardsLocalRepo';

/** Live count of non-deleted cards per category id; `undefined` until the first read. */
export function useCategoryCounts(): Record<string, number> | undefined {
  return useLiveQuery(countCardsByCategory, []);
}
