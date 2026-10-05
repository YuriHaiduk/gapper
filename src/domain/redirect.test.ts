import { describe, expect, it } from 'vitest';
import { safeRedirect } from './redirect';

describe('safeRedirect', () => {
  it.each(['/cards', '/cards?status=learning&category=law', '/categories', '/cards/abc'])(
    'accepts same-app path %s',
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'cards',
    '//evil.com',
    '/\\evil.com',
    'https://evil.com/cards',
    'javascript:alert(1)',
  ])('falls back to /cards for %s', (value) => {
    expect(safeRedirect(value)).toBe('/cards');
  });
});
