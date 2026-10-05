import { describe, expect, it } from 'vitest';
import { formatDate } from './dates';

describe('formatDate', () => {
  it('formats an ISO timestamp as a medium date in the device locale', () => {
    const iso = '2026-10-05T12:00:00.000Z';
    expect(formatDate(iso)).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso)),
    );
    expect(formatDate(iso)).toMatch(/2026/);
  });
});
