import type { Card, Category } from '@/domain/types';
import { RemoteError } from '@/repositories/remote/errors';
import type { RemoteRow, RemoteTable, SyncRemote } from '@/repositories/remote/types';

type Row = { id: string; updated_at: string };

/**
 * In-memory stand-in for Supabase that mimics the server rules the client relies on
 * (SPEC §15, §17): LWW skip of stale updates, trigger-owned `server_updated_at`,
 * card category → Other, category delete reassigns cards, unique category names.
 */
export class FakeServer {
  categories = new Map<string, RemoteRow<Category>>();
  cards = new Map<string, RemoteRow<Card>>();
  audio = new Map<string, Blob>();
  /** Every remote call in order, e.g. `upsert:card:card-1`, `upload:<path>`. */
  calls: string[] = [];
  /** When set, the next remote call throws it (then it is cleared unless `sticky`). */
  failNext: { error: RemoteError; sticky?: boolean; match?: string } | null = null;
  /** Called after an upsert is applied, before it returns (simulates in-flight time). */
  onUpsert: ((call: string) => Promise<void> | void) | null = null;

  private clock = Date.parse('2026-06-01T00:00:00.000Z');

  tick(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  private maybeFail(call: string): void {
    this.calls.push(call);
    const fail = this.failNext;
    if (!fail || (fail.match && !call.startsWith(fail.match))) return;
    if (!fail.sticky) this.failNext = null;
    throw fail.error;
  }

  private otherId(): string {
    const other = [...this.categories.values()].find((c) => c.is_system);
    if (!other) throw new Error('FakeServer: no Other category');
    return other.id;
  }

  /** Seeds a row as if written by another device. */
  seedCategory(category: Category): RemoteRow<Category> {
    const row = { ...category, server_updated_at: this.tick() };
    this.categories.set(row.id, row);
    return row;
  }

  seedCard(card: Card): RemoteRow<Card> {
    const row = { ...card, server_updated_at: this.tick() };
    this.cards.set(row.id, row);
    return row;
  }

  private table<T extends Row>(
    name: 'card' | 'category',
    rows: Map<string, RemoteRow<T>>,
    beforeWrite: (row: T, old: RemoteRow<T> | undefined) => T,
    afterWrite: (row: RemoteRow<T>, old: RemoteRow<T> | undefined) => void,
  ): RemoteTable<T & { id: string }> {
    return {
      upsert: async (input) => {
        const call = `upsert:${name}:${input.id}`;
        this.maybeFail(call);
        const old = rows.get(input.id);
        if (old && input.updated_at < old.updated_at) return null; // LWW skip
        const row = { ...beforeWrite(structuredClone(input), old), server_updated_at: this.tick() };
        rows.set(row.id, row);
        afterWrite(row, old);
        await this.onUpsert?.(call);
        return structuredClone(row);
      },
      getById: (id) => {
        this.maybeFail(`get:${name}:${id}`);
        const row = rows.get(id);
        return Promise.resolve(row ? structuredClone(row) : null);
      },
      pullSince: (cursor, limit) => {
        this.maybeFail(`pull:${name}:${cursor}`);
        const result = [...rows.values()]
          .filter((row) => row.server_updated_at > cursor)
          .sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at))
          .slice(0, limit)
          .map((row) => structuredClone(row));
        return Promise.resolve(result);
      },
    };
  }

  remote(): SyncRemote {
    return {
      categories: this.table<Category>(
        'category',
        this.categories,
        (row, old) => {
          if (old?.is_system && (row.name !== old.name || row.deleted_at !== null)) {
            throw new RemoteError('rejected', 'Other is protected', '23514');
          }
          const lower = row.name.toLowerCase();
          const clash = [...this.categories.values()].some(
            (c) =>
              c.id !== row.id &&
              c.deleted_at === null &&
              row.deleted_at === null &&
              (c.name.toLowerCase() === lower || c.slug === row.slug),
          );
          if (clash) throw new RemoteError('rejected', 'duplicate key', '23505');
          return row;
        },
        (row, old) => {
          if (old?.deleted_at === null && row.deleted_at !== null) {
            for (const card of this.cards.values()) {
              if (card.category_id === row.id) {
                this.cards.set(card.id, {
                  ...card,
                  category_id: this.otherId(),
                  server_updated_at: this.tick(),
                });
              }
            }
          }
        },
      ),
      cards: this.table<Card>(
        'card',
        this.cards,
        (row) => {
          const category = this.categories.get(row.category_id);
          if (!category || category.deleted_at !== null) row.category_id = this.otherId();
          return row;
        },
        () => undefined,
      ),
      audio: {
        upload: (path, blob) => {
          this.maybeFail(`upload:${path}`);
          this.audio.set(path, blob);
          return Promise.resolve();
        },
        remove: (pathOrPrefix) => {
          this.maybeFail(`remove:${pathOrPrefix}`);
          for (const path of [...this.audio.keys()]) {
            if (
              pathOrPrefix.endsWith('/') ? path.startsWith(pathOrPrefix) : path === pathOrPrefix
            ) {
              this.audio.delete(path);
            }
          }
          return Promise.resolve();
        },
        download: (path) => {
          this.maybeFail(`download:${path}`);
          const blob = this.audio.get(path);
          if (!blob) return Promise.reject(new RemoteError('rejected', 'Object not found', '404'));
          return Promise.resolve(blob);
        },
      },
    };
  }
}
