import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { plainToRichText } from '@/domain/richText';
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
        notes: null,
        type: null,
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

    it('stores notes as given and notes without text as null', async () => {
      const notes = plainToRichText('доказ\nproof');
      expect(await createCard({ title: 'proof', notes, category_id: LAW.id })).toMatchObject({
        notes,
        category_id: LAW.id,
      });
      const empty = { type: 'doc' as const, content: [{ type: 'paragraph' }] };
      expect((await createCard({ title: 'x', notes: empty })).notes).toBeNull();
    });

    it('stores a known part of speech; empty or unknown → null (D63)', async () => {
      expect((await createCard({ title: 'x', type: 'phrasal_verb' })).type).toBe('phrasal_verb');
      for (const type of [null, undefined, '', 'Noun', 'conjunction']) {
        // Values from outside the typed form (old rows, the server) are normalized too.
        const input = { title: 'x', type: type as never };
        expect((await createCard(input)).type).toBeNull();
      }
    });

    it('AC-36: empty, unknown or deleted category → Other', async () => {
      for (const category_id of [null, '', 'nope', GONE.id]) {
        expect((await createCard({ title: 'x', category_id })).category_id).toBe(OTHER_ID);
      }
    });

    it('AC-21: rejects invalid input with field errors and saves nothing', async () => {
      const error = await createCard({
        title: ' ',
        notes: plainToRichText('x'.repeat(5001)),
      }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CardValidationError);
      expect((error as CardValidationError).fields).toEqual({
        title: REQUIRED_TITLE,
        notes: tooLongMessage(5000),
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
      const notes = plainToRichText('залишити');
      const card = await updateCard('c1', { title: 'abandon', notes, category_id: LAW.id });
      expect(card).toMatchObject({ notes, created_at: T0, updated_at: NOW });
      expect((await getCard('c1'))?.notes).toEqual(notes);
      expect(await outbox()).toEqual(['card:upsert:c1']);
    });

    it('AC-36: clearing the category moves the card to Other', async () => {
      expect(
        (await updateCard('c1', { title: 'abandon', notes: plainToRichText('покинути') }))
          .category_id,
      ).toBe(OTHER_ID);
    });

    it('an unchanged card is a no-op', async () => {
      const card = await updateCard('c1', {
        title: ' abandon',
        notes: plainToRichText('покинути'),
        category_id: LAW.id,
        status: 'learning',
      });
      expect(card.updated_at).toBe(T0);
      expect(await outbox()).toEqual([]);
    });

    it('a part-of-speech-only change is saved (D63)', async () => {
      const input = { title: 'abandon', notes: plainToRichText('покинути'), category_id: LAW.id };
      const card = await updateCard('c1', { ...input, type: 'verb' });
      expect(card).toMatchObject({ type: 'verb', updated_at: NOW });
      expect(await outbox()).toEqual(['card:upsert:c1']);
      expect((await updateCard('c1', { ...input, type: null })).type).toBeNull();
    });

    it('applies the learned_at rules when the status changes', async () => {
      const input = { title: 'abandon', notes: plainToRichText('покинути'), category_id: LAW.id };
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

  describe('audio (SPEC §10.3)', () => {
    const recorded = { blob: new Blob(['abc'], { type: 'audio/mp4' }), mime: 'audio/mp4' };
    const OLD = `${USER_ID}/c1/old.m4a`;
    const input = { title: 'abandon', notes: plainToRichText('покинути'), category_id: LAW.id };
    const pathPattern = (cardId: string, ext: string) =>
      new RegExp(`^${USER_ID}/${cardId}/[0-9a-f-]{36}\\.${ext}$`);

    it('create with a recording: blob stored unsent, upload queued before the card', async () => {
      const card = await createCard({ title: 'abandon' }, recorded);
      expect(card.audio_path).toMatch(pathPattern(card.id, 'm4a'));
      const path = card.audio_path ?? '';
      expect(await db.audio_blobs.get(path)).toMatchObject({
        card_id: card.id,
        mime: 'audio/mp4',
        uploaded: 0,
        created_at: NOW,
      });
      expect((await getCard(card.id))?.audio_path).toBe(path);
      expect(await outbox()).toEqual([`audio:upload:${path}`, `card:upsert:${card.id}`]);
    });

    it('replace: new upload, card upsert, then old delete; old local blob dropped', async () => {
      await applyRemoteCard(makeCard({ id: 'c1', category_id: LAW.id, audio_path: OLD }));
      await db.audio_blobs.put({
        path: OLD,
        card_id: 'c1',
        blob: new Blob(['old']),
        mime: 'audio/mp4',
        uploaded: 1,
        created_at: T0,
      });
      const webm = { blob: new Blob(['x']), mime: 'audio/webm;codecs=opus' };
      const card = await updateCard('c1', input, { kind: 'replace', audio: webm });
      expect(card.audio_path).toMatch(pathPattern('c1', 'webm'));
      expect(card.updated_at).toBe(NOW);
      expect(await db.audio_blobs.get(OLD)).toBeUndefined();
      expect(await outbox()).toEqual([
        `audio:upload:${card.audio_path ?? ''}`,
        'card:upsert:c1',
        `audio:delete:${OLD}`,
      ]);
    });

    it('remove: audio_path null, card upsert, then old delete', async () => {
      await applyRemoteCard(makeCard({ id: 'c1', category_id: LAW.id, audio_path: OLD }));
      const card = await updateCard('c1', input, { kind: 'remove' });
      expect(card.audio_path).toBeNull();
      expect(await outbox()).toEqual(['card:upsert:c1', `audio:delete:${OLD}`]);
    });

    it('keep, or remove without audio, on an unchanged card is a no-op', async () => {
      await applyRemoteCard(makeCard({ id: 'c1', category_id: LAW.id }));
      expect((await updateCard('c1', input, { kind: 'keep' })).updated_at).toBe(T0);
      expect((await updateCard('c1', input, { kind: 'remove' })).updated_at).toBe(T0);
      expect(await outbox()).toEqual([]);
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
