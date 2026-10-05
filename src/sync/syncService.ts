import { LIMITS, PULL_OVERLAP_MS, PULL_PAGE_SIZE } from '@/domain/constants';
import { uniqueSlug, slugify } from '@/domain/slugify';
import { nowIso, toIso } from '@/domain/timestamps';
import type { Card, Category, MetaKey, OutboxEntry } from '@/domain/types';
import { baseMime } from '@/domain/audio';
import {
  getAudioBlob,
  markAudioUploaded,
  putCachedAudio,
} from '@/repositories/local/audioLocalRepo';
import {
  applyRemoteCard,
  getCard,
  reassignCategory,
  removeCard,
} from '@/repositories/local/cardsLocalRepo';
import {
  applyRemoteCategory,
  getCategory,
  getOtherCategory,
  listCategories,
  removeCategory,
  saveCategory,
} from '@/repositories/local/categoriesLocalRepo';
import { getMeta, setMeta } from '@/repositories/local/metaRepo';
import {
  getEntry,
  hasPending,
  listPending,
  markFailed,
  removeEntry,
} from '@/repositories/local/outboxRepo';
import { isUniqueViolation, RemoteError } from '@/repositories/remote/errors';
import type { RemoteTable, SyncRemote } from '@/repositories/remote/types';
import { sortForPush } from './pushOrder';

export type SyncStatus = 'ok' | 'offline' | 'auth_error' | 'error';

export type SyncResult = {
  status: SyncStatus;
  /** Outbox entries pushed successfully. */
  pushed: number;
  /** Remote rows applied locally. */
  pulled: number;
  /** Entries rejected by the server during this run. */
  rejected: number;
};

export type SyncService = {
  sync(): Promise<SyncResult>;
  /** Resolves when no run is active or queued (before wiping local data, D49). */
  whenIdle: () => Promise<void>;
  /**
   * Drops a failed outbox entry and restores the server's copy of its row; a row the server
   * never got is removed locally (D53). Throws a `RemoteError` when offline.
   */
  discard: (entryId: number) => Promise<void>;
  /** Downloads a recording and caches it locally for offline playback (SPEC §10.4, D47). */
  downloadAudio: (path: string, cardId: string) => Promise<Blob>;
};

/** Push passes per run: a pass is repeated only when a row was edited while being pushed. */
const MAX_PUSH_PASSES = 3;

type PushOutcome = 'done' | 'again';

class StopSync extends Error {
  readonly status: SyncStatus;
  constructor(status: SyncStatus) {
    super(status);
    this.status = status;
  }
}

function stopStatus(error: unknown): SyncStatus | null {
  if (error instanceof StopSync) return error.status;
  if (error instanceof RemoteError && error.kind === 'network') return 'offline';
  if (error instanceof RemoteError && error.kind === 'auth') return 'auth_error';
  return null;
}

/** `Name (2)`, `Name (3)`, … not used locally, within the name length limit (SPEC §15.5). */
function collisionName(name: string, taken: ReadonlySet<string>): string {
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = name.slice(0, LIMITS.categoryName - suffix.length).trimEnd() + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** Sync engine (SPEC §15): push the outbox, then pull deltas. `sync()` is single-flight. */
export function createSyncService(remote: SyncRemote): SyncService {
  // --- applying server truth locally ------------------------------------------

  async function dropCategory(id: string): Promise<void> {
    const other = await getOtherCategory();
    if (other) await reassignCategory(id, other.id);
    await removeCategory(id);
  }

  async function applyCategory(row: Category): Promise<void> {
    if (row.deleted_at === null) await applyRemoteCategory(row);
    else await dropCategory(row.id);
  }

  async function applyCard(row: Card): Promise<void> {
    if (row.deleted_at === null) await applyRemoteCard(row);
    else await removeCard(row.id);
  }

  // --- push ----------------------------------------------------------------------

  /**
   * Pushes one row and writes the server row back. If the user edited the row while the
   * request was in flight (D28), the entry is kept and pushed again.
   */
  async function pushRow<T extends Card | Category>(
    entry: OutboxEntry,
    table: RemoteTable<T>,
    getLocal: (id: string) => Promise<T | undefined>,
    apply: (row: T) => Promise<void>,
  ): Promise<PushOutcome> {
    const local = await getLocal(entry.entity_id);
    if (!local) {
      await removeEntry(entry.id);
      return 'done';
    }
    // `null` = the LWW trigger skipped a stale write → the server copy wins (SPEC §15.3).
    const server = (await table.upsert(local)) ?? (await table.getById(local.id));
    const current = await getLocal(local.id);
    if (current && current.updated_at !== local.updated_at) return 'again';
    if (server) await apply(server);
    await removeEntry(entry.id);
    return 'done';
  }

  async function pushCategory(entry: OutboxEntry): Promise<PushOutcome> {
    try {
      return await pushRow(entry, remote.categories, getCategory, applyCategory);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Same name created on another device → rename locally and retry once (SPEC §15.5).
      const category = await getCategory(entry.entity_id);
      if (!category) throw error;
      const others = (await listCategories()).filter((c) => c.id !== category.id);
      const name = collisionName(category.name, new Set(others.map((c) => c.name.toLowerCase())));
      await saveCategory({
        ...category,
        name,
        slug: uniqueSlug(slugify(name), new Set(others.map((c) => c.slug))),
        updated_at: nowIso(),
      });
      return pushRow(entry, remote.categories, getCategory, applyCategory);
    }
  }

  async function pushAudio(entry: OutboxEntry): Promise<PushOutcome> {
    if (entry.op === 'upload') {
      const audio = await getAudioBlob(entry.entity_id);
      if (audio) {
        await remote.audio.upload(audio.path, audio.blob, baseMime(audio.mime));
        await markAudioUploaded(audio.path);
      }
    } else {
      await remote.audio.remove(entry.entity_id);
    }
    await removeEntry(entry.id);
    return 'done';
  }

  function pushEntry(entry: OutboxEntry): Promise<PushOutcome> {
    if (entry.entity === 'category') return pushCategory(entry);
    if (entry.entity === 'card') return pushRow(entry, remote.cards, getCard, applyCard);
    return pushAudio(entry);
  }

  async function push(result: SyncResult): Promise<void> {
    const rejectedIds = new Set<number>();
    for (let pass = 0; pass < MAX_PUSH_PASSES; pass++) {
      const entries = sortForPush(await listPending()).filter((e) => !rejectedIds.has(e.id));
      let again = false;
      for (const entry of entries) {
        // Entry may have been removed meanwhile (e.g. discarded by the user).
        if (!(await getEntry(entry.id))) continue;
        try {
          if ((await pushEntry(entry)) === 'again') again = true;
          else result.pushed++;
        } catch (error) {
          const status = stopStatus(error);
          if (status) throw new StopSync(status);
          if (!(error instanceof RemoteError)) throw error;
          rejectedIds.add(entry.id);
          result.rejected++;
          await markFailed(entry.id, error.message);
        }
      }
      if (!again) return;
    }
  }

  // --- pull ----------------------------------------------------------------------

  async function pullTable<T extends Card | Category>(
    table: RemoteTable<T>,
    entity: 'card' | 'category',
    cursorKey: Extract<MetaKey, 'cards_cursor' | 'categories_cursor'>,
    apply: (row: T) => Promise<void>,
    result: SyncResult,
  ): Promise<void> {
    const saved = await getMeta(cursorKey);
    // Overlap guards against rows committed out of server_updated_at order (SPEC §15.4).
    let since = saved ? toIso(Date.parse(saved) - PULL_OVERLAP_MS) : toIso(0);
    for (;;) {
      const rows = await table.pullSince(since, PULL_PAGE_SIZE);
      for (const row of rows) {
        // A pending local change wins locally; the server decides via LWW on push.
        if (await hasPending(entity, row.id)) continue;
        await apply(row);
        result.pulled++;
      }
      const last = rows.at(-1);
      if (!last) return;
      since = last.server_updated_at;
      if (!saved || since > saved) await setMeta(cursorKey, since);
      if (rows.length < PULL_PAGE_SIZE) return;
    }
  }

  async function pull(result: SyncResult): Promise<void> {
    await pullTable(remote.categories, 'category', 'categories_cursor', applyCategory, result);
    await pullTable(remote.cards, 'card', 'cards_cursor', applyCard, result);
  }

  // --- run -----------------------------------------------------------------------

  async function run(): Promise<SyncResult> {
    const result: SyncResult = { status: 'ok', pushed: 0, pulled: 0, rejected: 0 };
    // Known offline: don't touch the network (supabase-js would also retry failed GETs).
    if (!navigator.onLine) return { ...result, status: 'offline' };
    try {
      await push(result);
      await pull(result);
      await setMeta('last_sync_at', nowIso());
      await setMeta('initial_sync_done', true);
    } catch (error) {
      const status = stopStatus(error);
      if (status) {
        result.status = status;
      } else {
        console.error('Sync failed', error);
        result.status = 'error';
      }
    }
    return result;
  }

  let running: Promise<SyncResult> | null = null;
  let queued: Promise<SyncResult> | null = null;

  function sync(): Promise<SyncResult> {
    if (!running) {
      running = run().finally(() => {
        running = null;
      });
      return running;
    }
    // A trigger during a run gets exactly one follow-up run (it may carry new writes).
    queued ??= running.then(() => {
      queued = null;
      return sync();
    });
    return queued;
  }

  async function whenIdle(): Promise<void> {
    while (running ?? queued) {
      await (queued ?? running);
    }
  }

  async function discard(entryId: number): Promise<void> {
    const entry = await getEntry(entryId);
    if (!entry) return;
    if (entry.entity === 'category') {
      const server = await remote.categories.getById(entry.entity_id);
      await removeEntry(entry.id);
      if (server) await applyCategory(server);
      else await dropCategory(entry.entity_id);
    } else if (entry.entity === 'card') {
      const server = await remote.cards.getById(entry.entity_id);
      await removeEntry(entry.id);
      if (server) await applyCard(server);
      else await removeCard(entry.entity_id);
    } else {
      await removeEntry(entry.id);
    }
  }

  async function downloadAudio(path: string, cardId: string): Promise<Blob> {
    const blob = await remote.audio.download(path);
    await putCachedAudio({ path, card_id: cardId, blob, mime: blob.type, created_at: nowIso() });
    return blob;
  }

  return { sync, whenIdle, discard, downloadAudio };
}
