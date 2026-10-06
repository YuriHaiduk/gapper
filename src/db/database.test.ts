import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { plainToRichText } from '@/domain/richText';
import { db } from './database';

describe('Dexie v1 → v2 upgrade (D42)', () => {
  afterEach(async () => {
    if (!db.isOpen()) await db.open();
  });

  it('merges the old text fields into notes and recomputes _search', async () => {
    db.close();
    await Dexie.delete('gapper');
    const v1 = new Dexie('gapper');
    v1.version(1).stores({
      cards: 'id, [created_at+id], status, category_id',
      categories: 'id, slug',
      audio_blobs: 'path, card_id',
      outbox: '++id, [entity+entity_id]',
      meta: 'key',
    });
    await v1.table('cards').bulkAdd([
      {
        id: 'a',
        title: 'abandon',
        translation: ' покинути ',
        example_sentence: 'He abandoned the car.\nThey abandoned hope.',
        example_sentence_translation: null,
        created_at: '2026-01-01T00:00:00.000Z',
        _search: 'abandon покинути',
      },
      {
        id: 'b',
        title: 'empty',
        translation: '  ',
        example_sentence: null,
        example_sentence_translation: null,
        created_at: '2026-01-01T00:00:00.000Z',
        _search: 'empty',
      },
    ]);
    v1.close();

    await db.open();
    const a = await db.cards.get('a');
    expect(a).not.toHaveProperty('translation');
    expect(a).not.toHaveProperty('example_sentence');
    expect(a).not.toHaveProperty('example_sentence_translation');
    expect(a?.notes).toEqual(
      plainToRichText('покинути\nHe abandoned the car.\nThey abandoned hope.'),
    );
    expect(a?._search).toBe('abandon покинути he abandoned the car. they abandoned hope.');
    expect((await db.cards.get('b'))?.notes).toBeNull();
  });
});

describe('Dexie v2 → v3 upgrade (D63)', () => {
  afterEach(async () => {
    if (!db.isOpen()) await db.open();
  });

  it('gives existing cards an explicit null part of speech', async () => {
    db.close();
    await Dexie.delete('gapper');
    const v2 = new Dexie('gapper');
    v2.version(2).stores({
      cards: 'id, [created_at+id], status, category_id',
      categories: 'id, slug',
      audio_blobs: 'path, card_id',
      outbox: '++id, [entity+entity_id]',
      meta: 'key',
    });
    await v2.table('cards').add({
      id: 'a',
      title: 'abandon',
      notes: null,
      created_at: '2026-01-01T00:00:00.000Z',
      _search: 'abandon',
    });
    v2.close();

    await db.open();
    const a = await db.cards.get('a');
    expect(a).toHaveProperty('type', null);
    expect(a?.title).toBe('abandon');
  });
});
