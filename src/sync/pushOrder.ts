import type { OutboxEntry } from '@/domain/types';

/**
 * Push phases (D27): categories → audio uploads → cards → audio deletes, FIFO within a
 * phase. Pure FIFO breaks once edits coalesce (a card moved to a category created after
 * the card's first entry would be pushed before that category exists).
 */
export function pushPhase(entry: Pick<OutboxEntry, 'entity' | 'op'>): number {
  if (entry.entity === 'category') return 0;
  if (entry.entity === 'audio') return entry.op === 'upload' ? 1 : 3;
  return 2;
}

export function sortForPush<T extends Pick<OutboxEntry, 'id' | 'entity' | 'op'>>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => pushPhase(a) - pushPhase(b) || a.id - b.id);
}
