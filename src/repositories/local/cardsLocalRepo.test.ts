import { describe, expect, it } from 'vitest';
import { makeCard } from '@/test/factories';
import { applyRemoteCard, countCardFacets, listCards } from './cardsLocalRepo';

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();

async function seed(
  count: number,
  overrides: (i: number) => Parameters<typeof makeCard>[0] = () => ({}),
) {
  for (let i = 0; i < count; i++) {
    await applyRemoteCard(
      makeCard({ id: `card-${String(i).padStart(2, '0')}`, created_at: at(i), ...overrides(i) }),
    );
  }
}

const ids = (cards: { id: string }[]) => cards.map((card) => card.id);

describe('listCards (T2)', () => {
  it('orders newest first, ties broken by id descending', async () => {
    await seed(3);
    await applyRemoteCard(makeCard({ id: 'card-zz', created_at: at(1) }));
    expect(ids(await listCards({}, undefined, 10))).toEqual([
      'card-02',
      'card-zz',
      'card-01',
      'card-00',
    ]);
  });

  it('returns at most `limit` cards so the caller can detect more', async () => {
    await seed(35);
    const page = await listCards({}, undefined, 21);
    expect(page).toHaveLength(21);
    expect(page[0]?.id).toBe('card-34');
    expect(await listCards({}, undefined, 41)).toHaveLength(35);
  });

  it('applies status, category and search filters before the limit', async () => {
    await seed(60, (i) => ({
      category_id: i % 2 === 0 ? 'law' : 'other',
      status: i % 4 < 2 ? 'learning' : 'learned',
      learned_at: i % 4 < 2 ? null : at(i),
    }));
    const page = await listCards({ status: 'learning', categorySlug: 'law' }, 'law', 21);
    expect(page).toHaveLength(15);
    expect(page.every((card) => card.status === 'learning' && card.category_id === 'law')).toBe(
      true,
    );
  });

  it('matches search case- and diacritic-insensitively and excludes deleted cards', async () => {
    await applyRemoteCard(makeCard({ id: 'a', title: 'Burden of PROOF', created_at: at(1) }));
    await applyRemoteCard(makeCard({ id: 'b', title: 'café', created_at: at(2) }));
    await applyRemoteCard(
      makeCard({ id: 'c', title: 'proof', created_at: at(3), deleted_at: at(4) }),
    );
    expect(ids(await listCards({ q: 'proof' }, undefined, 10))).toEqual(['a']);
    expect(ids(await listCards({ q: 'CAFE' }, undefined, 10))).toEqual(['b']);
  });

  it('returns local-only fields stripped', async () => {
    await seed(1);
    expect(await listCards({}, undefined, 1)).toEqual([
      makeCard({ id: 'card-00', created_at: at(0) }),
    ]);
  });
});

describe('countCardFacets', () => {
  it('counts per status and category', async () => {
    await seed(4, (i) => ({ category_id: i < 3 ? 'law' : 'other' }));
    expect(await countCardFacets({}, undefined)).toEqual({
      byStatus: { all: 4, learning: 4, learned: 0 },
      byCategory: { law: 3, other: 1 },
      allCategories: 4,
    });
  });
});
