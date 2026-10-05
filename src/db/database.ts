import { Dexie, type EntityTable } from 'dexie';
import { plainToRichText } from '@/domain/richText';
import { buildSearchText } from '@/domain/search';
import type { AudioBlobRow, Category, LocalCard, MetaRow, OutboxEntry } from '@/domain/types';

/** Card row shape of Dexie v1, only for the v2 upgrade. */
type V1Card = {
  title?: string;
  translation?: string | null;
  example_sentence?: string | null;
  example_sentence_translation?: string | null;
};

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
    // v2 (D42): translation / example_sentence / example_sentence_translation → `notes`,
    // merged like the SQL migration (one paragraph per line, in field order).
    this.version(2)
      .stores({
        cards: 'id, [created_at+id], status, category_id',
        categories: 'id, slug',
        audio_blobs: 'path, card_id',
        outbox: '++id, [entity+entity_id]',
        meta: 'key',
      })
      .upgrade((tx) =>
        tx
          .table<V1Card>('cards')
          .toCollection()
          .modify((card: V1Card & Partial<LocalCard>) => {
            const merged = [
              card.translation,
              card.example_sentence,
              card.example_sentence_translation,
            ]
              .map((value) => value?.trim() ?? '')
              .filter((value) => value !== '')
              .join('\n');
            delete card.translation;
            delete card.example_sentence;
            delete card.example_sentence_translation;
            card.notes = plainToRichText(merged);
            card._search = buildSearchText({ title: card.title ?? '', notes: card.notes });
          }),
      );
  }
}

export const db = new GapperDb();

/** Empties every table: sign-out, a different user signing in (D49), tests. */
export async function wipeLocalData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
