import { useLiveQuery } from 'dexie-react-hooks';
import { sortCategories } from '@/domain/categories';
import type { Category } from '@/domain/types';
import { listCategories } from '@/repositories/local/categoriesLocalRepo';

/** Live, sorted non-deleted categories; `undefined` until the first local read. */
export function useCategories(): Category[] | undefined {
  return useLiveQuery(async () => sortCategories(await listCategories()), []);
}
