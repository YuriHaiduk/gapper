import { describe, expect, it } from 'vitest';
import { buildSearchText, matchesSearch, normalizeText } from './search';

describe('search', () => {
  it('normalizes case, diacritics and whitespace', () => {
    expect(normalizeText('  Café   CRÈME\n')).toBe('cafe creme');
  });

  it('builds search text from title, translation and example', () => {
    expect(
      buildSearchText({
        title: 'Burden',
        translation: null,
        example_sentence: 'The burden of proof',
      }),
    ).toBe('burden the burden of proof');
  });

  it('requires every word to match (AND), as substrings', () => {
    const text = buildSearchText({
      title: 'burden of proof',
      translation: 'тягар доведення',
      example_sentence: null,
    });
    expect(matchesSearch(text, 'PROOF тягар')).toBe(true);
    expect(matchesSearch(text, 'proo')).toBe(true);
    expect(matchesSearch(text, 'proof contract')).toBe(false);
    expect(matchesSearch(text, '   ')).toBe(true);
  });

  it('matches regardless of accents in the query', () => {
    expect(matchesSearch(normalizeText('naive'), 'naïve')).toBe(true);
  });
});
