import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { DUPLICATE_CATEGORY_NAME } from '@/domain/validation';
import { applyRemoteCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';
import { createCategory, deleteCategory, renameCategory } from './categoryService';
import { ValidationError } from './errors';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });

async function outbox() {
  return (await db.outbox.toArray()).map((e) => `${e.entity}:${e.op}:${e.entity_id}`);
}

describe('categoryService', () => {
  beforeEach(async () => {
    await setMeta('user_id', USER_ID);
    await applyRemoteCategory(makeOther());
    await applyRemoteCategory(LAW);
  });

  describe('createCategory', () => {
    it('trims the name, derives the slug and queues the upsert', async () => {
      const created = await createCategory('  Idioms ');
      expect(created).toMatchObject({
        name: 'Idioms',
        slug: 'idioms',
        user_id: USER_ID,
        is_system: false,
        deleted_at: null,
        server_updated_at: null,
      });
      expect(created.created_at).toBe(created.updated_at);
      expect(await db.categories.get(created.id)).toEqual(created);
      expect(await outbox()).toEqual([`category:upsert:${created.id}`]);
    });

    it('appends a suffix when the slug is taken', async () => {
      // "Law!" is a different name but slugifies to "law".
      expect((await createCategory('Law!')).slug).toBe('law-2');
    });

    it('rejects a duplicate name in any case', async () => {
      await expect(createCategory('lAW')).rejects.toThrow(
        new ValidationError(DUPLICATE_CATEGORY_NAME),
      );
      await expect(createCategory('Other')).rejects.toThrow(DUPLICATE_CATEGORY_NAME);
      expect(await outbox()).toEqual([]);
    });

    it('rejects empty and too long names', async () => {
      await expect(createCategory('   ')).rejects.toThrow('Name is required.');
      await expect(createCategory('x'.repeat(41))).rejects.toThrow(
        'Must be at most 40 characters.',
      );
    });

    it('allows the name and slug of a deleted category', async () => {
      await deleteCategory(LAW.id);
      expect(await createCategory('Law')).toMatchObject({ name: 'Law', slug: 'law' });
    });
  });

  describe('renameCategory', () => {
    it('renames, regenerates the slug and bumps updated_at', async () => {
      const renamed = await renameCategory(LAW.id, ' Legal ');
      expect(renamed).toMatchObject({ name: 'Legal', slug: 'legal', created_at: LAW.created_at });
      expect(renamed.updated_at > LAW.updated_at).toBe(true);
      expect(await db.categories.get(LAW.id)).toEqual(renamed);
      expect(await outbox()).toEqual([`category:upsert:${LAW.id}`]);
    });

    it('allows a case-only change of its own name', async () => {
      expect(await renameCategory(LAW.id, 'LAW')).toMatchObject({ name: 'LAW', slug: 'law' });
    });

    it('is a no-op when the name is unchanged', async () => {
      expect(await renameCategory(LAW.id, 'Law ')).toEqual(LAW);
      expect(await outbox()).toEqual([]);
    });

    it('rejects a name used by another category', async () => {
      await applyRemoteCategory(makeCategory({ id: 'cat-work', name: 'Work', slug: 'work' }));
      await expect(renameCategory(LAW.id, 'work')).rejects.toThrow(DUPLICATE_CATEGORY_NAME);
    });

    it('refuses to rename Other', async () => {
      await expect(renameCategory(OTHER_ID, 'Misc')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteCategory', () => {
    it('tombstones the category and moves its cards to Other without touching them', async () => {
      const card = makeCard({ id: 'c1', category_id: LAW.id });
      await applyRemoteCard(card);
      await applyRemoteCard(makeCard({ id: 'c2', category_id: OTHER_ID }));

      await deleteCategory(LAW.id);

      const tombstone = await db.categories.get(LAW.id);
      expect(tombstone?.deleted_at).not.toBeNull();
      expect(tombstone?.updated_at).toBe(tombstone?.deleted_at);
      const moved = await db.cards.get('c1');
      expect(moved?.category_id).toBe(OTHER_ID);
      expect(moved?.updated_at).toBe(card.updated_at);
      expect(await outbox()).toEqual([`category:upsert:${LAW.id}`]);
    });

    it('refuses to delete Other', async () => {
      await expect(deleteCategory(OTHER_ID)).rejects.toBeInstanceOf(ValidationError);
      expect(await outbox()).toEqual([]);
    });

    it('fails for an unknown or already deleted category', async () => {
      await expect(deleteCategory('nope')).rejects.toThrow('not found');
      await deleteCategory(LAW.id);
      await expect(deleteCategory(LAW.id)).rejects.toThrow('not found');
    });
  });
});
