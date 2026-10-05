import { describe, expect, it } from 'vitest';
import { deleteCardPrompt, duplicateTitleKey } from './cardForm';

describe('cardForm helpers', () => {
  it('deleteCardPrompt', () => {
    expect(deleteCardPrompt('abandon')).toBe('Delete “abandon”? This cannot be undone.');
  });

  it('duplicateTitleKey trims and lowercases', () => {
    expect(duplicateTitleKey('  Abandon ')).toBe('abandon');
  });
});
