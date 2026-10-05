import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import type * as cardsLocalRepo from '@/repositories/local/cardsLocalRepo';
import { getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
import { countAll } from '@/repositories/local/outboxRepo';
import { FakeServer } from '@/test/fakeRemote';
import { makeCard, makeOther } from '@/test/factories';
import { createSyncService } from './syncService';

/** Runs once right after the next `getCard` read. */
const hooks = vi.hoisted(() => ({
  afterGetCard: null as (() => void) | null,
}));

vi.mock('@/repositories/local/cardsLocalRepo', async (importOriginal) => {
  const actual = await importOriginal<typeof cardsLocalRepo>();
  return {
    ...actual,
    getCard: async (id: string) => {
      const card = await actual.getCard(id);
      const hook = hooks.afterGetCard;
      hooks.afterGetCard = null;
      hook?.();
      return card;
    },
  };
});

let server: FakeServer;

beforeEach(async () => {
  server = new FakeServer();
  await db.categories.put(server.seedCategory(makeOther()));
  hooks.afterGetCard = null;
});

/** A user save racing the sync: its own transaction, started outside the sync's one. */
function concurrentEdit(title: string) {
  let done = Promise.resolve();
  return {
    start() {
      done = Dexie.ignoreTransaction(() =>
        saveCard(makeCard({ title, updated_at: '2026-06-02T00:00:00.000Z' })),
      );
    },
    get done() {
      return done;
    },
  };
}

describe('sync vs. a concurrent user edit (D61)', () => {
  it('push write-back does not overwrite an edit saved after the in-flight check', async () => {
    await saveCard(makeCard({ title: 'first' }));
    const edit = concurrentEdit('second');
    let reads = 0;
    // 1st getCard: payload read; 2nd: the "edited meanwhile?" check — the edit lands right after.
    const arm = () => {
      hooks.afterGetCard = () => {
        reads++;
        if (reads < 2) arm();
        else edit.start();
      };
    };
    arm();

    await createSyncService(server.remote()).sync();
    await edit.done;

    expect((await getCard('card-1'))?.title).toBe('second');
    expect(await countAll()).toBe(1);
  });
});
