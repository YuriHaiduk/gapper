import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slugify';

describe('slugify', () => {
  it.each([
    ['Law', 'law'],
    ['  Phrasal   verbs! ', 'phrasal-verbs'],
    ['Café & Crème', 'cafe-creme'],
    ['Їжа', 'їжа'],
    ['Йога й спорт', 'йога-й-спорт'],
    ['B2 — Grammar', 'b2-grammar'],
    ['!!!', 'category'],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('appends -2, -3… when taken', () => {
    expect(uniqueSlug('law', new Set())).toBe('law');
    expect(uniqueSlug('law', new Set(['law', 'law-2']))).toBe('law-3');
  });
});
