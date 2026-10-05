import { describe, expect, it } from 'vitest';
import { plainToRichText } from './richText';
import { buildSearchText, matchesSearch, normalizeText } from './search';

describe('search', () => {
  it('normalizes case, diacritics and whitespace', () => {
    expect(normalizeText('  Café   CRÈME\n')).toBe('cafe creme');
  });

  it('builds search text from the title and the notes text', () => {
    expect(
      buildSearchText({ title: 'Burden', notes: plainToRichText('The burden\nof proof') }),
    ).toBe('burden the burden of proof');
    expect(buildSearchText({ title: 'Burden', notes: null })).toBe('burden');
  });

  it('requires every word to match (AND), as substrings', () => {
    const text = buildSearchText({
      title: 'burden of proof',
      notes: plainToRichText('тягар доведення'),
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
