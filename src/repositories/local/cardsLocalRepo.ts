import { db } from '@/db/database';
import { countFacets, matchesCardFilter, type CardFacets } from '@/domain/cardFilter';
import { duplicateTitleKey } from '@/domain/cardForm';
import { buildSearchText } from '@/domain/search';
import { nowIso } from '@/domain/timestamps';
import type { AudioBlobRow, Card, CardFilter, LocalCard } from '@/domain/types';
import { enqueue } from './outboxRepo';

function toLocal(card: Card): LocalCard {
  return { ...card, _search: buildSearchText(card) };
}

/** Strips local-only fields. */
export function toCard(row: LocalCard): Card {
  const { _search, ...card } = row;
  return card;
}

export async function getCard(id: string): Promise<Card | undefined> {
  const row = await db.cards.get(id);
  return row && toCard(row);
}

/**
 * First `limit` matching cards, newest first (`created_at DESC, id DESC`, SPEC §11.4, §12).
 * `categoryId` is the id resolved from `filter.categorySlug`. Callers ask for `visibleCount + 1`.
 */
export async function listCards(
  filter: CardFilter,
  categoryId: string | undefined,
  limit: number,
): Promise<Card[]> {
  const rows = await db.cards
    .orderBy('[created_at+id]')
    .reverse()
    .filter((card) => matchesCardFilter(card, filter, categoryId))
    .limit(limit)
    .toArray();
  return rows.map(toCard);
}

export type AdjacentCards = { prev: Card | null; next: Card | null };

/**
 * Keyset neighbours in the list order (SPEC §13): `prev` = nearest newer, `next` = nearest
 * older card matching the context. Computed from the position, so the current card itself
 * doesn't have to match (AC-34). `categoryId` is the id resolved from `filter.categorySlug`.
 */
export async function getAdjacentCards(
  position: Pick<Card, 'created_at' | 'id'>,
  filter: CardFilter,
  categoryId: string | undefined,
): Promise<AdjacentCards> {
  const key = [position.created_at, position.id];
  const matches = (card: LocalCard) => matchesCardFilter(card, filter, categoryId);
  const [prev, next] = await Promise.all([
    db.cards.where('[created_at+id]').above(key).filter(matches).first(),
    db.cards.where('[created_at+id]').below(key).reverse().filter(matches).first(),
  ]);
  return { prev: prev ? toCard(prev) : null, next: next ? toCard(next) : null };
}

/** Faceted filter-sheet counts (SPEC §11.2). */
export async function countCardFacets(
  filter: CardFilter,
  categoryId: string | undefined,
): Promise<CardFacets> {
  return countFacets(await db.cards.toArray(), filter, categoryId);
}

/** Recording changes saved together with a card (SPEC §10.3). */
export type CardAudioWrite = {
  /** New recording (`uploaded = 0`), uploaded before the card upsert. */
  add?: AudioBlobRow;
  /** Previous recording, deleted from Storage after the card upsert. */
  removePath?: string;
};

/**
 * User write: row + outbox entries in one transaction. With audio: `audio:upload(new)`,
 * `card:upsert`, then `audio:delete(old)`; the old local blob is dropped at once.
 */
export async function saveCard(card: Card, audio: CardAudioWrite = {}): Promise<void> {
  await db.transaction('rw', db.cards, db.audio_blobs, db.outbox, async () => {
    if (audio.add) {
      await db.audio_blobs.put(audio.add);
      await enqueue('audio', 'upload', audio.add.path);
    }
    await db.cards.put(toLocal(card));
    await enqueue('card', 'upsert', card.id);
    if (audio.removePath) {
      // A pending upload of it is dropped by sync once its blob is gone.
      await db.audio_blobs.delete(audio.removePath);
      await enqueue('audio', 'delete', audio.removePath);
    }
  });
}

/**
 * User delete (SPEC §7.3): tombstone + `card:upsert`, then removal of every recording of the
 * card from Storage via one folder `audio:delete` (D29). The row is removed once synced.
 */
export async function deleteCardLocally(card: Card): Promise<void> {
  const now = nowIso();
  await db.transaction('rw', db.cards, db.outbox, async () => {
    await db.cards.put(toLocal({ ...card, deleted_at: now, updated_at: now }));
    await enqueue('card', 'upsert', card.id);
    await enqueue('audio', 'delete', `${card.user_id}/${card.id}/`);
  });
}

/** Non-deleted cards with the same title, trimmed and case-insensitive (duplicate hint, §7.1). */
export async function findCardsByTitle(title: string, excludeId?: string): Promise<Card[]> {
  const key = duplicateTitleKey(title);
  if (key === '') return [];
  const rows = await db.cards
    .filter(
      (card) =>
        card.deleted_at === null && card.id !== excludeId && duplicateTitleKey(card.title) === key,
    )
    .toArray();
  return rows.map(toCard);
}

/**
 * Server truth written locally without an outbox entry. Cached recordings the card no
 * longer references (replaced on another device) are dropped; unsent ones are kept.
 */
export async function applyRemoteCard(card: Card): Promise<void> {
  await db.transaction('rw', db.cards, db.audio_blobs, async () => {
    await db.cards.put(toLocal(card));
    await db.audio_blobs
      .where('card_id')
      .equals(card.id)
      .filter((row) => row.uploaded === 1 && row.path !== card.audio_path)
      .delete();
  });
}

/** Removes the row and its cached audio (after its tombstone is synced). */
export async function removeCard(id: string): Promise<void> {
  await db.transaction('rw', db.cards, db.audio_blobs, async () => {
    await db.cards.delete(id);
    await db.audio_blobs.where('card_id').equals(id).delete();
  });
}

/**
 * Moves cards of a deleted category to `Other` without an outbox entry and without
 * touching `updated_at` — mirrors the server trigger (SPEC §8.5, §15.5).
 */
export async function reassignCategory(fromId: string, toId: string): Promise<void> {
  await db.cards.where('category_id').equals(fromId).modify({ category_id: toId });
}

/** Non-deleted cards per category id (SPEC §8.5 card counts). */
export async function countCardsByCategory(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await db.cards
    .filter((card) => card.deleted_at === null)
    .each((card) => {
      counts[card.category_id] = (counts[card.category_id] ?? 0) + 1;
    });
  return counts;
}
