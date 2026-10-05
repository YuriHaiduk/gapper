import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { PULL_PAGE_SIZE } from '@/domain/constants';
import { getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
import { getCategory, saveCategory } from '@/repositories/local/categoriesLocalRepo';
import { getMeta, setMeta } from '@/repositories/local/metaRepo';
import { countAll, countFailed, enqueue } from '@/repositories/local/outboxRepo';
import { RemoteError } from '@/repositories/remote/errors';
import { createCard, updateCard } from '@/services/cardService';
import { FakeServer } from '@/test/fakeRemote';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';
import { createSyncService, type SyncService } from './syncService';

let server: FakeServer;
let service: SyncService;

/** Server and device both know `Other` (as after the first sync). */
async function seedOther(): Promise<void> {
  const other = server.seedCategory(makeOther());
  await db.categories.put(other);
}

const later = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 0, minutes)).toISOString();
const pushCalls = () => server.calls.filter((call) => !call.startsWith('pull:'));

beforeEach(async () => {
  server = new FakeServer();
  service = createSyncService(server.remote());
  await seedOther();
});

describe('push', () => {
  it('pushes categories, audio uploads, cards, audio deletes — FIFO within each phase', async () => {
    const path = `${USER_ID}/card-1/rec-1.m4a`;
    await saveCard(makeCard({ id: 'card-1' }));
    await saveCategory(makeCategory({ id: 'cat-new', name: 'Idioms', slug: 'idioms' }));
    await enqueue('audio', 'delete', `${USER_ID}/card-1/old.m4a`);
    await db.audio_blobs.put({
      path,
      card_id: 'card-1',
      blob: new Blob(['x']),
      mime: 'audio/mp4',
      uploaded: 0,
      created_at: later(0),
    });
    await enqueue('audio', 'upload', path);
    // Coalesced edit: card moved to the category created after the card's first entry.
    await saveCard(
      makeCard({ id: 'card-1', category_id: 'cat-new', audio_path: path, updated_at: later(1) }),
    );

    const result = await service.sync();

    expect(result).toMatchObject({ status: 'ok', pushed: 4, rejected: 0 });
    expect(pushCalls()).toEqual([
      'upsert:category:cat-new',
      `upload:${path}`,
      'upsert:card:card-1',
      `remove:${USER_ID}/card-1/old.m4a`,
    ]);
    expect(server.cards.get('card-1')?.category_id).toBe('cat-new');
    expect((await db.audio_blobs.get(path))?.uploaded).toBe(1);
    expect(await countAll()).toBe(0);
  });

  it('writes the server row back, including trigger adjustments', async () => {
    await saveCard(makeCard({ category_id: 'cat-missing' }));
    await service.sync();
    const local = await getCard('card-1');
    expect(local?.category_id).toBe(OTHER_ID);
    expect(local?.server_updated_at).not.toBeNull();
  });

  it('keeps the entry when the row is edited while its push is in flight', async () => {
    await saveCard(makeCard({ title: 'first' }));
    server.onUpsert = async () => {
      server.onUpsert = null;
      await saveCard(makeCard({ title: 'second', updated_at: later(5) }));
    };
    const result = await service.sync();
    expect(result.status).toBe('ok');
    expect(server.cards.get('card-1')?.title).toBe('second');
    expect((await getCard('card-1'))?.title).toBe('second');
    expect(await countAll()).toBe(0);
  });

  it('AC-53: a stale pending edit is skipped by the server and replaced locally', async () => {
    server.seedCard(makeCard({ title: 'server 10:05', updated_at: later(65) }));
    await saveCard(makeCard({ title: 'device 10:00', updated_at: later(60) }));

    await service.sync();

    expect(server.cards.get('card-1')?.title).toBe('server 10:05');
    expect((await getCard('card-1'))?.title).toBe('server 10:05');
    expect(await countAll()).toBe(0);
  });

  it('AC-52: the newer edit wins on the server', async () => {
    server.seedCard(makeCard({ title: 'device A 10:00', updated_at: later(60) }));
    await saveCard(makeCard({ title: 'device B 10:05', updated_at: later(65) }));
    await service.sync();
    expect(server.cards.get('card-1')?.title).toBe('device B 10:05');
    expect((await getCard('card-1'))?.title).toBe('device B 10:05');
  });

  it('removes a tombstone locally once it is pushed', async () => {
    await saveCard(makeCard({ deleted_at: later(1), updated_at: later(1) }));
    await service.sync();
    expect(server.cards.get('card-1')?.deleted_at).toBe(later(1));
    expect(await db.cards.count()).toBe(0);
  });

  it('drops entries whose local row or blob no longer exists', async () => {
    await enqueue('card', 'upsert', 'ghost');
    await enqueue('audio', 'upload', 'ghost/path.m4a');
    const result = await service.sync();
    expect(result.status).toBe('ok');
    expect(pushCalls()).toEqual([]);
    expect(await countAll()).toBe(0);
  });

  it('stops on a network error and keeps the outbox', async () => {
    await saveCard(makeCard({ id: 'a' }));
    await saveCard(makeCard({ id: 'b' }));
    server.failNext = { error: new RemoteError('network', 'Failed to fetch') };

    const result = await service.sync();

    expect(result).toMatchObject({ status: 'offline', pushed: 0 });
    expect(pushCalls()).toEqual(['upsert:card:a']);
    expect(await countAll()).toBe(2);
    expect((await db.outbox.toArray()).every((e) => e.attempts === 0)).toBe(true);
    expect(await getMeta('initial_sync_done')).toBeUndefined();
  });

  it('does not touch the network while the browser is offline', async () => {
    await saveCard(makeCard());
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect((await service.sync()).status).toBe('offline');
    } finally {
      onLine.mockRestore();
    }
    expect(server.calls).toEqual([]);
    expect(await countAll()).toBe(1);
  });

  it('stops on an auth error', async () => {
    await saveCard(makeCard());
    server.failNext = { error: new RemoteError('auth', 'JWT expired', 'PGRST303') };
    expect((await service.sync()).status).toBe('auth_error');
    expect(await countAll()).toBe(1);
  });

  it('counts a rejection, continues, and parks the entry after 5 attempts', async () => {
    await saveCard(makeCard({ id: 'bad' }));
    await saveCard(makeCard({ id: 'good' }));
    server.failNext = {
      error: new RemoteError('rejected', 'check violation', '23514'),
      sticky: true,
      match: 'upsert:card:bad',
    };

    const first = await service.sync();
    expect(first).toMatchObject({ status: 'ok', pushed: 1, rejected: 1 });
    expect(server.cards.has('good')).toBe(true);
    const [entry] = await db.outbox.toArray();
    expect(entry).toMatchObject({ entity_id: 'bad', attempts: 1, last_error: 'check violation' });

    for (let i = 0; i < 4; i++) await service.sync();
    expect(await countFailed()).toBe(1);
    server.calls = [];
    await service.sync();
    expect(pushCalls()).toEqual([]);
  });

  it('renames a category on a name collision and retries once', async () => {
    server.seedCategory(makeCategory({ id: 'cat-a', name: 'Idioms', slug: 'idioms' }));
    await saveCategory(
      makeCategory({ id: 'cat-b', name: 'Idioms', slug: 'idioms', updated_at: later(1) }),
    );

    const result = await service.sync();

    expect(result).toMatchObject({ status: 'ok', rejected: 0 });
    expect(server.categories.get('cat-b')).toMatchObject({ name: 'Idioms (2)', slug: 'idioms-2' });
    expect(await getCategory('cat-b')).toMatchObject({ name: 'Idioms (2)', slug: 'idioms-2' });
    expect(await getCategory('cat-a')).toMatchObject({ name: 'Idioms' });
  });
});

describe('pull', () => {
  it('pulls all rows on first sync, stores cursors and marks the initial sync', async () => {
    server.seedCategory(makeCategory({ id: 'cat-law' }));
    server.seedCard(makeCard({ id: 'c1', category_id: 'cat-law', title: 'Café' }));

    const result = await service.sync();

    expect(result).toMatchObject({ status: 'ok', pulled: 3 });
    expect((await db.cards.get('c1'))?._search).toBe('cafe покинути');
    expect(await getMeta('categories_cursor')).toBe(
      server.categories.get('cat-law')?.server_updated_at,
    );
    expect(await getMeta('cards_cursor')).toBe(server.cards.get('c1')?.server_updated_at);
    expect(await getMeta('initial_sync_done')).toBe(true);
    expect(await getMeta('last_sync_at')).toBeDefined();
  });

  it('pulls from the cursor minus a 60 s overlap and pages through results', async () => {
    const cursor = '2026-05-31T23:59:30.000Z'; // FakeServer clock starts at 06-01 00:00
    await setMeta('cards_cursor', cursor);
    for (let i = 0; i < PULL_PAGE_SIZE + 1; i++) server.seedCard(makeCard({ id: `c${i}` }));

    await service.sync();

    const cardPulls = server.calls.filter((call) => call.startsWith('pull:card:'));
    expect(cardPulls[0]).toBe('pull:card:2026-05-31T23:58:30.000Z');
    expect(cardPulls).toHaveLength(2);
    expect(await db.cards.count()).toBe(PULL_PAGE_SIZE + 1);
  });

  it('remote wins unless the local row has a pending change', async () => {
    await db.cards.put({ ...makeCard({ id: 'clean', title: 'old' }), _search: '' });
    server.seedCard(makeCard({ id: 'clean', title: 'remote' }));
    server.seedCard(makeCard({ id: 'dirty', title: 'remote' }));
    await saveCard(makeCard({ id: 'dirty', title: 'local edit' }));

    // The push of `dirty` is rejected, so its entry is still pending when the pull runs.
    server.failNext = {
      error: new RemoteError('rejected', 'nope', '42501'),
      sticky: true,
      match: 'upsert:',
    };
    await service.sync();

    expect((await getCard('clean'))?.title).toBe('remote');
    expect((await getCard('dirty'))?.title).toBe('local edit');
  });

  it('AC-54: a deleted category disappears and its cards move to Other', async () => {
    const law = makeCategory({ id: 'cat-law' });
    server.seedCategory(law);
    server.seedCard(makeCard({ id: 'c1', category_id: 'cat-law' }));
    await service.sync();
    expect((await getCard('c1'))?.category_id).toBe('cat-law');

    // Device A deletes the category; the server trigger reassigns its cards.
    await server.remote().categories.upsert({ ...law, deleted_at: later(2), updated_at: later(2) });
    await service.sync();

    expect(await getCategory('cat-law')).toBeUndefined();
    expect((await getCard('c1'))?.category_id).toBe(OTHER_ID);
  });

  it('a pulled card tombstone removes the card and its cached audio', async () => {
    const card = makeCard({ audio_path: `${USER_ID}/card-1/r.m4a` });
    server.seedCard(card);
    await service.sync();
    await db.audio_blobs.put({
      path: card.audio_path ?? '',
      card_id: card.id,
      blob: new Blob(['x']),
      mime: 'audio/mp4',
      uploaded: 1,
      created_at: later(0),
    });

    server.seedCard({ ...card, deleted_at: later(3), updated_at: later(3) });
    await service.sync();

    expect(await db.cards.count()).toBe(0);
    expect(await db.audio_blobs.count()).toBe(0);
  });
});

describe('single flight', () => {
  it('shares the running sync and schedules exactly one follow-up', async () => {
    await saveCard(makeCard());
    const [a, b, c] = [service.sync(), service.sync(), service.sync()];
    expect(b).toBe(c);
    await Promise.all([a, b]);
    expect(
      server.calls.filter((call) => call === 'pull:category:1970-01-01T00:00:00.000Z'),
    ).toHaveLength(1);
    expect(server.calls.filter((call) => call.startsWith('pull:category:'))).toHaveLength(2);
    expect(server.calls.filter((call) => call.startsWith('upsert:'))).toHaveLength(1);
  });
});

describe('whenIdle', () => {
  it('resolves after the running sync and its follow-up', async () => {
    await saveCard(makeCard());
    const runs = [service.sync(), service.sync()];
    let settled = 0;
    for (const run of runs) void run.then(() => settled++);
    await service.whenIdle();
    expect(settled).toBe(2);
    await service.whenIdle(); // idle: resolves at once
  });
});

describe('discard (D53)', () => {
  /** Parks the card's entry as failed. */
  async function failCard(id: string): Promise<number> {
    const [entry] = await db.outbox.where('[entity+entity_id]').equals(['card', id]).toArray();
    if (!entry) throw new Error('no entry');
    await db.outbox.update(entry.id, { attempts: 5, last_error: 'check violation' });
    return entry.id;
  }

  it('restores the server copy of a rejected edit', async () => {
    server.seedCard(makeCard({ id: 'card-1', title: 'server' }));
    await saveCard(makeCard({ id: 'card-1', title: 'local', updated_at: later(5) }));
    await service.discard(await failCard('card-1'));
    expect(await countAll()).toBe(0);
    expect(await getCard('card-1')).toMatchObject({ title: 'server' });
  });

  it('removes a row the server never got', async () => {
    await saveCard(makeCard({ id: 'card-1' }));
    await service.discard(await failCard('card-1'));
    expect(await countAll()).toBe(0);
    expect(await getCard('card-1')).toBeUndefined();
  });

  it('moves cards of a discarded new category to Other', async () => {
    await saveCategory(makeCategory({ id: 'cat-new', name: 'Idioms', slug: 'idioms' }));
    await saveCard(makeCard({ id: 'card-1', category_id: 'cat-new' }));
    const [entry] = await db.outbox
      .where('[entity+entity_id]')
      .equals(['category', 'cat-new'])
      .toArray();
    await service.discard(entry?.id ?? -1);
    expect(await getCategory('cat-new')).toBeUndefined();
    expect(await getCard('card-1')).toMatchObject({ category_id: OTHER_ID });
  });

  it('drops an audio entry without touching rows', async () => {
    await enqueue('audio', 'delete', `${USER_ID}/card-1/old.m4a`);
    const [entry] = await db.outbox.toArray();
    await service.discard(entry?.id ?? -1);
    expect(await countAll()).toBe(0);
    expect(server.calls).toEqual([]);
  });

  it('keeps the entry when the server is unreachable', async () => {
    await saveCard(makeCard({ id: 'card-1' }));
    const id = await failCard('card-1');
    server.failNext = { error: new RemoteError('network', 'Failed to fetch') };
    await expect(service.discard(id)).rejects.toThrow(RemoteError);
    expect(await countAll()).toBe(1);
    expect(await getCard('card-1')).toBeDefined();
  });
});

describe('audio (SPEC §10.3, §10.4)', () => {
  const recorded = (text: string) => ({ blob: new Blob([text]), mime: 'audio/mp4' });

  beforeEach(async () => {
    await setMeta('user_id', USER_ID);
  });

  it('AC-39/AC-40: uploads before the card, deletes the replaced object after it', async () => {
    const created = await createCard({ title: 'abandon' }, recorded('one'));
    const first = created.audio_path ?? '';
    await service.sync();
    expect(server.audio.has(first)).toBe(true);
    expect(server.cards.get(created.id)?.audio_path).toBe(first);
    expect((await db.audio_blobs.get(first))?.uploaded).toBe(1);

    server.calls = [];
    const replaced = await updateCard(
      created.id,
      { title: 'abandon' },
      { kind: 'replace', audio: recorded('two') },
    );
    const second = replaced.audio_path ?? '';
    await service.sync();
    expect(pushCalls()).toEqual([
      `upload:${second}`,
      `upsert:card:${created.id}`,
      `remove:${first}`,
    ]);
    expect([...server.audio.keys()]).toEqual([second]);
    expect(server.cards.get(created.id)?.audio_path).toBe(second);
  });

  it('a recording replaced before it was sent is never uploaded', async () => {
    const created = await createCard({ title: 'abandon' }, recorded('one'));
    const replaced = await updateCard(
      created.id,
      { title: 'abandon' },
      { kind: 'replace', audio: recorded('two') },
    );
    await service.sync();
    expect([...server.audio.keys()]).toEqual([replaced.audio_path]);
    expect(await countAll()).toBe(0);
  });

  it('downloadAudio caches the blob as uploaded', async () => {
    const path = `${USER_ID}/card-1/r.m4a`;
    server.audio.set(path, new Blob(['x'], { type: 'audio/mp4' }));
    const blob = await service.downloadAudio(path, 'card-1');
    expect(await blob.text()).toBe('x');
    expect(await db.audio_blobs.get(path)).toMatchObject({
      card_id: 'card-1',
      mime: 'audio/mp4',
      uploaded: 1,
    });
  });

  it('downloadAudio rejects with a typed error when the object is missing', async () => {
    await expect(service.downloadAudio('nope.m4a', 'card-1')).rejects.toBeInstanceOf(RemoteError);
  });

  it('a pulled card with a new recording drops the stale cached one', async () => {
    const old = `${USER_ID}/card-1/old.m4a`;
    const card = makeCard({ audio_path: old });
    server.seedCard(card);
    await service.sync();
    await db.audio_blobs.put({
      path: old,
      card_id: card.id,
      blob: new Blob(['x']),
      mime: 'audio/mp4',
      uploaded: 1,
      created_at: later(0),
    });

    server.seedCard({ ...card, audio_path: `${USER_ID}/card-1/new.m4a`, updated_at: later(3) });
    await service.sync();

    expect(await db.audio_blobs.count()).toBe(0);
  });
});
