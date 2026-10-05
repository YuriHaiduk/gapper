import { LIMITS } from './constants';

/** Trimmed text, or null when empty (SPEC §7.1). */
export function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export const REQUIRED_TITLE = 'Title is required.';

export function tooLongMessage(max: number): string {
  return `Must be at most ${max} characters.`;
}

export type CardTextInput = {
  title: string;
  translation?: string | null;
  example_sentence?: string | null;
  example_sentence_translation?: string | null;
};

export type CardTextField = keyof CardTextInput;
export type CardFieldErrors = Partial<Record<CardTextField, string>>;

/** Validates card text fields after trimming. Empty object = valid. */
export function validateCardInput(input: CardTextInput): CardFieldErrors {
  const errors: CardFieldErrors = {};
  const title = input.title.trim();
  if (title === '') errors.title = REQUIRED_TITLE;
  else if (title.length > LIMITS.title) errors.title = tooLongMessage(LIMITS.title);

  for (const field of [
    'translation',
    'example_sentence',
    'example_sentence_translation',
  ] as const) {
    const value = normalizeOptional(input[field]);
    if (value !== null && value.length > LIMITS[field])
      errors[field] = tooLongMessage(LIMITS[field]);
  }
  return errors;
}

export const REQUIRED_CATEGORY_NAME = 'Name is required.';
export const DUPLICATE_CATEGORY_NAME = 'A category with this name already exists.';

/**
 * Validates a category name (SPEC §8.1). `existingNames` are the other non-deleted
 * categories' names; uniqueness is case-insensitive. Returns an error message or null.
 */
export function validateCategoryName(
  name: string,
  existingNames: readonly string[],
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return REQUIRED_CATEGORY_NAME;
  if (trimmed.length > LIMITS.categoryName) return tooLongMessage(LIMITS.categoryName);
  const lower = trimmed.toLowerCase();
  if (existingNames.some((existing) => existing.toLowerCase() === lower)) {
    return DUPLICATE_CATEGORY_NAME;
  }
  return null;
}
