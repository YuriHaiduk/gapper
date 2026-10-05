import type { CardStatus } from './types';

export const PAGE_SIZE = 20;

export const CARD_STATUSES: readonly CardStatus[] = ['learning', 'learned'];

/** Max lengths after trimming (SPEC §7.1, §8.1, §11.1). */
export const LIMITS = {
  title: 200,
  translation: 500,
  example_sentence: 1000,
  example_sentence_translation: 1000,
  categoryName: 40,
  query: 100,
} as const;

export const OTHER_SLUG = 'other';

/** Sync tuning (SPEC §15). */
export const MAX_PUSH_ATTEMPTS = 5;
export const PULL_PAGE_SIZE = 500;
export const PULL_OVERLAP_MS = 60_000;
