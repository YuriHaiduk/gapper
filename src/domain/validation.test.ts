import { describe, expect, it } from 'vitest';
import { normalizeOptional, validateCardInput, validateCategoryName } from './validation';

describe('validation', () => {
  it('normalizes optional text to trimmed or null', () => {
    expect(normalizeOptional('  x ')).toBe('x');
    expect(normalizeOptional('   ')).toBeNull();
    expect(normalizeOptional(undefined)).toBeNull();
  });

  it('requires a title and enforces limits after trimming', () => {
    expect(validateCardInput({ title: '   ' })).toEqual({ title: 'Title is required.' });
    expect(validateCardInput({ title: ` ${'a'.repeat(200)} ` })).toEqual({});
    expect(
      validateCardInput({
        title: 'a'.repeat(201),
        translation: 'b'.repeat(501),
        example_sentence: 'c'.repeat(1000),
        example_sentence_translation: 'd'.repeat(1001),
      }),
    ).toEqual({
      title: 'Must be at most 200 characters.',
      translation: 'Must be at most 500 characters.',
      example_sentence_translation: 'Must be at most 1000 characters.',
    });
  });

  it('validates category names case-insensitively unique', () => {
    expect(validateCategoryName('  ', [])).toBe('Name is required.');
    expect(validateCategoryName('x'.repeat(41), [])).toBe('Must be at most 40 characters.');
    expect(validateCategoryName(' law ', ['Law'])).toBe(
      'A category with this name already exists.',
    );
    expect(validateCategoryName('Idioms', ['Law'])).toBeNull();
  });
});
