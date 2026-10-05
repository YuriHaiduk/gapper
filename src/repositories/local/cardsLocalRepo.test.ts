import { describe, expect, it } from 'vitest';
import { makeCard } from '@/test/factories';
import {
  applyRemoteCard,
  countCardFacets,
  findCardsByTitle,
  getAdjacentCards,
  listCards,
} from './cardsLocalRepo';

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

describe('findCardsByTitle', () => {
  it('matches trimmed, case-insensitive titles of non-deleted cards except the excluded one', async () => {
    await applyRemoteCard(makeCard({ id: 'a', title: 'Abandon' }));
    await applyRemoteCard(makeCard({ id: 'b', title: 'abandon ' }));
    await applyRemoteCard(makeCard({ id: 'c', title: 'abandoned' }));
    await applyRemoteCard(makeCard({ id: 'd', title: 'abandon', deleted_at: at(1) }));
    expect(ids(await findCardsByTitle(' ABANDON')).sort()).toEqual(['a', 'b']);
    expect(ids(await findCardsByTitle('abandon', 'a'))).toEqual(['b']);
    expect(await findCardsByTitle('  ')).toEqual([]);
  });
});

describe('getAdjacentCards (T3)', () => {
  const titles = (result: Awaited<ReturnType<typeof getAdjacentCards>>) => [
    result.prev?.id ?? null,
    result.next?.id ?? null,
  ];
  const position = (i: number) => ({ id: `card-${String(i).padStart(2, '0')}`, created_at: at(i) });

  it('prev = nearest newer, next = nearest older; null at the edges', async () => {
    await seed(3);
    expect(titles(await getAdjacentCards(position(1), {}, undefined))).toEqual([
      'card-02',
      'card-00',
    ]);
    expect(titles(await getAdjacentCards(position(2), {}, undefined))).toEqual([null, 'card-01']);
    expect(titles(await getAdjacentCards(position(0), {}, undefined))).toEqual(['card-01', null]);
  });

  it('breaks created_at ties by id like the list', async () => {
    await seed(3);
    await applyRemoteCard(makeCard({ id: 'card-zz', created_at: at(1) }));
    // List order: card-02, card-zz, card-01, card-00
    expect(
      titles(await getAdjacentCards({ id: 'card-zz', created_at: at(1) }, {}, undefined)),
    ).toEqual(['card-02', 'card-01']);
    expect(titles(await getAdjacentCards(position(1), {}, undefined))).toEqual([
      'card-zz',
      'card-00',
    ]);
  });

  it('stays within the context and skips deleted cards', async () => {
    await seed(8, (i) => ({
      category_id: i % 2 === 0 ? 'law' : 'other',
      status: i < 4 ? 'learning' : 'learned',
      learned_at: i < 4 ? null : at(i),
      deleted_at: i === 6 ? at(9) : null,
    }));
    const filter = { status: 'learned', categorySlug: 'law' } as const;
    // Learned + Law: card-04, card-06 (deleted) → only card-04
    expect(titles(await getAdjacentCards(position(7), filter, 'law'))).toEqual([null, 'card-04']);
    expect(titles(await getAdjacentCards(position(4), filter, 'law'))).toEqual([null, null]);
    expect(titles(await getAdjacentCards(position(3), { status: 'learning' }, undefined))).toEqual([
      null,
      'card-02',
    ]);
  });

  it('works when the current card no longer matches the context (AC-34)', async () => {
    await seed(3, (i) => (i === 1 ? { status: 'learned', learned_at: at(5) } : {}));
    expect(titles(await getAdjacentCards(position(1), { status: 'learning' }, undefined))).toEqual([
      'card-02',
      'card-00',
    ]);
  });

  it('finds nothing for an unresolved category slug', async () => {
    await seed(3);
    expect(
      titles(await getAdjacentCards(position(1), { categorySlug: 'unknown' }, undefined)),
    ).toEqual([null, null]);
  });
});
