import { db } from '@/db/database';
import type { Category } from '@/domain/types';
import { nowIso } from '@/domain/timestamps';
import { reassignCategory } from './cardsLocalRepo';
import { enqueue } from './outboxRepo';

export function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export function getOtherCategory(): Promise<Category | undefined> {
  return db.categories.filter((category) => category.is_system).first();
}

/** Non-deleted categories (unsorted; ordering is a UI/service concern). */
export function listCategories(): Promise<Category[]> {
  return db.categories.filter((category) => category.deleted_at === null).toArray();
}

/** User write: row + outbox entry in one transaction. */
export async function saveCategory(category: Category): Promise<void> {
  await db.transaction('rw', db.categories, db.outbox, async () => {
    await db.categories.put(category);
    await enqueue('category', 'upsert', category.id);
  });
}

/**
 * User delete (SPEC §8.5): tombstone + outbox entry, and its cards move to `Other` in the
 * same transaction. Cards keep their `updated_at` and get no outbox entry — the server
 * trigger reassigns them too. The row is removed once the tombstone is synced.
 */
export async function deleteCategoryLocally(category: Category, otherId: string): Promise<void> {
  const now = nowIso();
  await db.transaction('rw', db.categories, db.cards, db.outbox, async () => {
    await db.categories.put({ ...category, deleted_at: now, updated_at: now });
    await enqueue('category', 'upsert', category.id);
    await reassignCategory(category.id, otherId);
  });
}

/** Server truth written locally without an outbox entry. */
export async function applyRemoteCategory(category: Category): Promise<void> {
  await db.categories.put(category);
}

export async function removeCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}
