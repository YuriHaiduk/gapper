import type { Card, CardStatus } from './types';

/**
 * `learned_at` for a status change (SPEC §7.2): set when a card becomes learned, kept while it
 * stays learned, cleared when it moves back to learning. `prev` is null for a new card.
 */
export function learnedAtFor(
  prev: Pick<Card, 'status' | 'learned_at'> | null,
  next: CardStatus,
  now: string,
): string | null {
  if (next === 'learning') return null;
  if (prev?.status === 'learned' && prev.learned_at !== null) return prev.learned_at;
  return now;
}
