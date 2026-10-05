import { db } from '@/db/database';
import { buildSearchText } from '@/domain/search';
import type { Card, LocalCard } from '@/domain/types';
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

/** User write: row + outbox entry in one transaction. */
export async function saveCard(card: Card): Promise<void> {
  await db.transaction('rw', db.cards, db.outbox, async () => {
    await db.cards.put(toLocal(card));
    await enqueue('card', 'upsert', card.id);
  });
}

/** Server truth written locally without an outbox entry. */
export async function applyRemoteCard(card: Card): Promise<void> {
  await db.cards.put(toLocal(card));
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
