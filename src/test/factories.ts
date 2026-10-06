import { plainToRichText } from '@/domain/richText';
import type { Card, Category } from '@/domain/types';

export const USER_ID = '00000000-0000-4000-8000-000000000001';
export const OTHER_ID = 'cat-other';

const T0 = '2026-01-01T00:00:00.000Z';

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    user_id: USER_ID,
    name: 'Law',
    slug: 'law',
    is_system: false,
    created_at: T0,
    updated_at: T0,
    deleted_at: null,
    server_updated_at: null,
    ...overrides,
  };
}

export function makeOther(overrides: Partial<Category> = {}): Category {
  return makeCategory({
    id: OTHER_ID,
    name: 'Other',
    slug: 'other',
    is_system: true,
    ...overrides,
  });
}

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    user_id: USER_ID,
    title: 'abandon',
    notes: plainToRichText('покинути'),
    type: null,
    category_id: OTHER_ID,
    status: 'learning',
    audio_path: null,
    learned_at: null,
    created_at: T0,
    updated_at: T0,
    deleted_at: null,
    server_updated_at: null,
    ...overrides,
  };
}
