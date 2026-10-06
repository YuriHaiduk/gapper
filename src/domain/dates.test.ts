import { describe, expect, it } from 'vitest';
import { formatDate } from './dates';

describe('formatDate', () => {
  it('formats an ISO timestamp as an English medium date (D64)', () => {
    // Midday UTC: the same calendar day in every common time zone.
    expect(formatDate('2026-10-05T12:00:00.000Z')).toBe('5 Oct 2026');
  });
});
