import { describe, expect, it } from 'vitest';
import { makeCard } from '@/test/factories';
import { matchesCardFilter, parseCardFilter, serializeCardFilter } from './cardFilter';
import { buildSearchText } from './search';
import type { Card } from './types';

const parse = (query: string) => parseCardFilter(new URLSearchParams(query));
const local = (card: Card) => ({ ...card, _search: buildSearchText(card) });

describe('parseCardFilter', () => {
  it('reads status, category and q', () => {
    expect(parse('status=learning&category=law&q=proof')).toEqual({
      status: 'learning',
      categorySlug: 'law',
      q: 'proof',
    });
  });

  it('returns an empty filter for no params', () => {
    expect(parse('')).toEqual({});
  });

  it('ignores an invalid status, empty values and unknown params', () => {
    expect(parse('status=done&category=&q=%20%20&sort=alpha')).toEqual({});
  });

  it('trims q and caps it at 100 characters', () => {
    expect(parse('q=%20burden%20of%20proof%20')).toEqual({ q: 'burden of proof' });
    expect(parse(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
  });
});

describe('serializeCardFilter', () => {
  it('uses the canonical order status, category, q', () => {
    expect(serializeCardFilter({ q: 'x y', categorySlug: 'law', status: 'learned' })).toBe(
      'status=learned&category=law&q=x+y',
    );
  });

  it('serializes an empty filter to an empty string', () => {
    expect(serializeCardFilter({})).toBe('');
    expect(serializeCardFilter({ q: '   ' })).toBe('');
  });

  it('round-trips and canonicalizes', () => {
    const canonical = serializeCardFilter(
      parse('q=proof&foo=1&category=%D1%97%D0%B6%D0%B0&status=learning'),
    );
    expect(canonical).toBe('status=learning&category=%D1%97%D0%B6%D0%B0&q=proof');
    expect(serializeCardFilter(parse(canonical))).toBe(canonical);
  });
});

describe('matchesCardFilter', () => {
  const card = local(makeCard({ category_id: 'cat-law', translation: 'Тягар доведення' }));

  it('matches everything with an empty filter', () => {
    expect(matchesCardFilter(card, {})).toBe(true);
  });

  it('filters by status and resolved category id', () => {
    expect(matchesCardFilter(card, { status: 'learned' })).toBe(false);
    expect(matchesCardFilter(card, { categorySlug: 'law' }, 'cat-law')).toBe(true);
    expect(matchesCardFilter(card, { categorySlug: 'law' }, 'cat-other')).toBe(false);
    expect(matchesCardFilter(card, { categorySlug: 'gone' }, undefined)).toBe(false);
  });

  it('applies search over the derived text', () => {
    expect(matchesCardFilter(card, { q: 'тягар' })).toBe(true);
    expect(matchesCardFilter(card, { q: 'тягар missing' })).toBe(false);
  });

  it('never matches deleted cards', () => {
    expect(matchesCardFilter({ ...card, deleted_at: '2026-01-02T00:00:00.000Z' }, {})).toBe(false);
  });
});
