import type { Category } from './types';

/** Menu order (SPEC §8.1): `Other` last, the rest alphabetically, locale-aware, case-insensitive. */
export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function cardCountLabel(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`;
}

/** Delete confirmation text (SPEC §8.5). */
export function deleteCategoryPrompt(name: string, cardCount: number): string {
  const question = `Delete “${name}”?`;
  if (cardCount === 0) return question;
  return `${question} Its ${cardCountLabel(cardCount)} will move to Other.`;
}
