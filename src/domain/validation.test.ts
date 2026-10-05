import { describe, expect, it } from 'vitest';
import { plainToRichText } from './richText';
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
    expect(validateCardInput({ title: 'a'.repeat(201) })).toEqual({
      title: 'Must be at most 200 characters.',
    });
  });

  it('limits notes to 5000 plain-text characters', () => {
    expect(validateCardInput({ title: 'x', notes: plainToRichText('b'.repeat(5000)) })).toEqual({});
    expect(validateCardInput({ title: 'x', notes: null })).toEqual({});
    expect(validateCardInput({ title: 'x', notes: plainToRichText('b'.repeat(5001)) })).toEqual({
      notes: 'Must be at most 5000 characters.',
    });
  });

  it('limits the notes document size', () => {
    const bold = { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'italic' }] };
    const notes = {
      type: 'doc' as const,
      content: Array.from({ length: 2000 }, () => ({ type: 'paragraph', content: [bold] })),
    };
    expect(validateCardInput({ title: 'x', notes })).toEqual({
      notes: 'Must be at most 5000 characters.',
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
