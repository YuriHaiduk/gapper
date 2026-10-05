import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { REQUIRED_TITLE, tooLongMessage } from '@/domain/validation';
import { applyRemoteCard, getCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';
import { createCard, deleteCard, setStatus, updateCard } from './cardService';
import { CardValidationError, NotFoundError } from './errors';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });
const GONE = makeCategory({
  id: 'cat-gone',
  name: 'Gone',
  slug: 'gone',
  deleted_at: '2026-01-02T00:00:00.000Z',
});
const T0 = '2026-01-01T00:00:00.000Z';
const NOW = '2026-03-01T12:00:00.000Z';

async function outbox() {
  return (await db.outbox.toArray()).map((e) => `${e.entity}:${e.op}:${e.entity_id}`);
}

describe('cardService (T4)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    await setMeta('user_id', USER_ID);
    await applyRemoteCategory(makeOther());
    await applyRemoteCategory(LAW);
    await applyRemoteCategory(GONE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCard', () => {
    it('AC-20: title only → Other, learning, learned_at null, queued', async () => {
      const card = await createCard({ title: '  abandon ' });
      expect(card).toMatchObject({
        title: 'abandon',
        translation: null,
        example_sentence: null,
        example_sentence_translation: null,
        category_id: OTHER_ID,
        status: 'learning',
        learned_at: null,
        audio_path: null,
        user_id: USER_ID,
        created_at: NOW,
        updated_at: NOW,
        deleted_at: null,
        server_updated_at: null,
      });
      expect(await getCard(card.id)).toEqual(card);
      expect(await outbox()).toEqual([`card:upsert:${card.id}`]);
    });

    it('trims text and stores empty optional fields as null', async () => {
      const card = await createCard({
        title: 'proof',
        translation: '  доказ ',
        example_sentence: '   ',
        example_sentence_translation: '',
        category_id: LAW.id,
      });
      expect(card).toMatchObject({
        translation: 'доказ',
        example_sentence: null,
        example_sentence_translation: null,
        category_id: LAW.id,
      });
    });

    it('AC-36: empty, unknown or deleted category → Other', async () => {
      for (const category_id of [null, '', 'nope', GONE.id]) {
        expect((await createCard({ title: 'x', category_id })).category_id).toBe(OTHER_ID);
      }
    });

    it('AC-21: rejects invalid input with field errors and saves nothing', async () => {
      const error = await createCard({ title: ' ', translation: 'x'.repeat(501) }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(CardValidationError);
      expect((error as CardValidationError).fields).toEqual({
        title: REQUIRED_TITLE,
        translation: tooLongMessage(500),
      });
      expect(await db.cards.count()).toBe(0);
      expect(await outbox()).toEqual([]);
    });
  });

  describe('updateCard', () => {
    beforeEach(async () => {
      await applyRemoteCard(makeCard({ id: 'c1', category_id: LAW.id }));
    });

    it('AC-35: changes fields and updated_at, keeps created_at', async () => {
      const card = await updateCard('c1', {
        title: 'abandon',
        translation: 'залишити',
        category_id: LAW.id,
      });
      expect(card).toMatchObject({ translation: 'залишити', created_at: T0, updated_at: NOW });
      expect((await getCard('c1'))?.translation).toBe('залишити');
      expect(await outbox()).toEqual(['card:upsert:c1']);
    });

    it('AC-36: clearing the category moves the card to Other', async () => {
      expect(
        (await updateCard('c1', { title: 'abandon', translation: 'покинути' })).category_id,
      ).toBe(OTHER_ID);
    });

    it('an unchanged card is a no-op', async () => {
      const card = await updateCard('c1', {
        title: ' abandon',
        translation: 'покинути ',
        category_id: LAW.id,
        status: 'learning',
      });
      expect(card.updated_at).toBe(T0);
      expect(await outbox()).toEqual([]);
    });

    it('applies the learned_at rules when the status changes', async () => {
      const input = { title: 'abandon', translation: 'покинути', category_id: LAW.id };
      expect(await updateCard('c1', { ...input, status: 'learned' })).toMatchObject({
        status: 'learned',
        learned_at: NOW,
      });
      expect(await updateCard('c1', { ...input, status: 'learning' })).toMatchObject({
        status: 'learning',
        learned_at: null,
      });
    });

    it('rejects a missing or deleted card', async () => {
      await applyRemoteCard(makeCard({ id: 'dead', deleted_at: T0 }));
      await expect(updateCard('nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
      await expect(updateCard('dead', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('setStatus', () => {
    it('learning → learned → learned → learning (SPEC §7.2)', async () => {
      await applyRemoteCard(makeCard({ id: 'c1' }));
      expect(await setStatus('c1', 'learned')).toMatchObject({
        status: 'learned',
        learned_at: NOW,
        updated_at: NOW,
        created_at: T0,
      });

      vi.setSystemTime('2026-03-02T00:00:00.000Z');
      expect((await setStatus('c1', 'learned')).learned_at).toBe(NOW);
      expect(await setStatus('c1', 'learning')).toMatchObject({
        status: 'learning',
        learned_at: null,
        updated_at: '2026-03-02T00:00:00.000Z',
      });
      expect(await outbox()).toEqual(['card:upsert:c1']);
    });
  });

  describe('deleteCard', () => {
    it('AC-37: tombstone, card upsert, then audio folder delete', async () => {
      await applyRemoteCard(makeCard({ id: 'c1' }));
      await deleteCard('c1');
      expect(await getCard('c1')).toMatchObject({ deleted_at: NOW, updated_at: NOW });
      expect(await outbox()).toEqual(['card:upsert:c1', `audio:delete:${USER_ID}/c1/`]);
      await expect(deleteCard('c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
