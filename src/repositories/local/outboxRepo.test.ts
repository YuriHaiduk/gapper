import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { makeCard } from '@/test/factories';
import { saveCard } from './cardsLocalRepo';
import { countAll, countFailed, enqueue, listPending, markFailed } from './outboxRepo';

describe('outboxRepo', () => {
  it('coalesces identical pending entries', async () => {
    await saveCard(makeCard());
    await saveCard(makeCard({ title: 'edited' }));
    await enqueue('audio', 'upload', 'u/c/r.m4a');
    await enqueue('audio', 'delete', 'u/c/r.m4a');
    const entries = await listPending();
    expect(entries.map((e) => `${e.entity}:${e.op}:${e.entity_id}`)).toEqual([
      'card:upsert:card-1',
      'audio:upload:u/c/r.m4a',
      'audio:delete:u/c/r.m4a',
    ]);
    expect((await db.cards.get('card-1'))?._search).toBe('edited покинути');
  });

  it('re-arms a failed entry on a new edit', async () => {
    await saveCard(makeCard());
    const [entry] = await listPending();
    if (!entry) throw new Error('expected an entry');
    for (let i = 0; i < 5; i++) await markFailed(entry.id, 'rejected');
    expect(await listPending()).toEqual([]);
    expect(await countFailed()).toBe(1);

    await saveCard(makeCard({ title: 'fixed' }));
    expect(await countFailed()).toBe(0);
    expect(await listPending()).toHaveLength(1);
  });

  it('writes the row and the entry atomically', async () => {
    await expect(
      db.transaction('rw', db.cards, db.outbox, async () => {
        await db.cards.put({ ...makeCard(), _search: '' });
        await enqueue('card', 'upsert', 'card-1');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.cards.count()).toBe(0);
    expect(await countAll()).toBe(0);
  });
});
