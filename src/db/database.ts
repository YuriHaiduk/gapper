import { Dexie, type EntityTable } from 'dexie';
import type { AudioBlobRow, Category, LocalCard, MetaRow, OutboxEntry } from '@/domain/types';

/** The app's working database (SPEC §16.2). Never edit a released version block. */
export class GapperDb extends Dexie {
  cards!: EntityTable<LocalCard, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  audio_blobs!: EntityTable<AudioBlobRow, 'path'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super('gapper');
    this.version(1).stores({
      cards: 'id, [created_at+id], status, category_id',
      categories: 'id, slug',
      audio_blobs: 'path, card_id',
      outbox: '++id, [entity+entity_id]',
      meta: 'key',
    });
  }
}

export const db = new GapperDb();

/** Empties every table (tests; logout wipe in step 10 deletes the whole database). */
export async function clearDb(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
