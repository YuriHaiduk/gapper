import { db } from '@/db/database';
import type { Category } from '@/domain/types';
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

/** Server truth written locally without an outbox entry. */
export async function applyRemoteCategory(category: Category): Promise<void> {
  await db.categories.put(category);
}

export async function removeCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}
