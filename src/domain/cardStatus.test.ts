import { describe, expect, it } from 'vitest';
import { learnedAtFor } from './cardStatus';

const NOW = '2026-02-01T00:00:00.000Z';
const EARLIER = '2026-01-01T00:00:00.000Z';

describe('learnedAtFor (SPEC §7.2)', () => {
  it('new learning card → null; new learned card → now', () => {
    expect(learnedAtFor(null, 'learning', NOW)).toBeNull();
    expect(learnedAtFor(null, 'learned', NOW)).toBe(NOW);
  });

  it('learning → learned sets now', () => {
    expect(learnedAtFor({ status: 'learning', learned_at: null }, 'learned', NOW)).toBe(NOW);
  });

  it('learned → learned keeps the timestamp', () => {
    expect(learnedAtFor({ status: 'learned', learned_at: EARLIER }, 'learned', NOW)).toBe(EARLIER);
  });

  it('learned → learning clears it', () => {
    expect(learnedAtFor({ status: 'learned', learned_at: EARLIER }, 'learning', NOW)).toBeNull();
  });
});
