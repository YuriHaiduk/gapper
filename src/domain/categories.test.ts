import { describe, expect, it } from 'vitest';
import { makeCategory, makeOther } from '@/test/factories';
import { cardCountLabel, deleteCategoryPrompt, sortCategories } from './categories';

describe('sortCategories', () => {
  it('puts Other last and sorts the rest case-insensitively', () => {
    const sorted = sortCategories([
      makeOther(),
      makeCategory({ id: 'w', name: 'work' }),
      makeCategory({ id: 'a', name: 'Ärger' }),
      makeCategory({ id: 'l', name: 'Law' }),
      makeCategory({ id: 'e', name: 'Everyday' }),
    ]);
    expect(sorted.map((c) => c.name)).toEqual(['Ärger', 'Everyday', 'Law', 'work', 'Other']);
  });

  it('does not mutate its input', () => {
    const input = [makeOther(), makeCategory()];
    sortCategories(input);
    expect(input[0]?.name).toBe('Other');
  });
});

describe('labels', () => {
  it('pluralizes card counts', () => {
    expect(cardCountLabel(0)).toBe('0 cards');
    expect(cardCountLabel(1)).toBe('1 card');
    expect(cardCountLabel(7)).toBe('7 cards');
  });

  it('builds the delete prompt', () => {
    expect(deleteCategoryPrompt('Law', 7)).toBe('Delete “Law”? Its 7 cards will move to Other.');
    expect(deleteCategoryPrompt('Law', 1)).toBe('Delete “Law”? Its 1 card will move to Other.');
    expect(deleteCategoryPrompt('Law', 0)).toBe('Delete “Law”?');
  });
});
