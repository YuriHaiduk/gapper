import { describe, expect, it } from 'vitest';
import {
  normalizeRichText,
  plainToRichText,
  richTextPreview,
  richTextToPlain,
  sameRichText,
} from './richText';
import type { RichText } from './types';

const text = (value: string, marks?: string[]) => ({
  type: 'text',
  text: value,
  ...(marks && { marks: marks.map((type) => ({ type })) }),
});
const p = (...content: ReturnType<typeof text>[]) => ({ type: 'paragraph', content });
const li = (value: string) => ({ type: 'listItem', content: [p(text(value))] });

const DOC: RichText = {
  type: 'doc',
  content: [
    { type: 'paragraph' },
    p(text('He '), text('abandoned', ['bold']), text(' the car.')),
    { type: 'bulletList', content: [li('one'), li('two')] },
    { type: 'orderedList', content: [li('three')] },
    { type: 'paragraph', content: [text('a'), { type: 'hardBreak' }, text('b')] },
  ],
};

describe('richText', () => {
  it('richTextToPlain: one line per block, marks dropped', () => {
    expect(richTextToPlain(DOC)).toBe('He abandoned the car.\none\ntwo\nthree\na\nb');
    expect(richTextToPlain(null)).toBe('');
    expect(richTextToPlain({ type: 'doc' })).toBe('');
  });

  it('richTextPreview: first non-empty line', () => {
    expect(richTextPreview(DOC)).toBe('He abandoned the car.');
    expect(richTextPreview(null)).toBe('');
  });

  it('plainToRichText: paragraphs per line, null when blank (same as the migration)', () => {
    expect(plainToRichText('  a\n\nb ')).toEqual({
      type: 'doc',
      content: [p(text('a')), { type: 'paragraph' }, p(text('b'))],
    });
    expect(plainToRichText('   ')).toBeNull();
  });

  it('normalizeRichText: a doc without text is null', () => {
    expect(normalizeRichText({ type: 'doc', content: [{ type: 'paragraph' }] })).toBeNull();
    expect(
      normalizeRichText({ type: 'doc', content: [{ type: 'bulletList', content: [] }] }),
    ).toBeNull();
    expect(normalizeRichText(DOC)).toBe(DOC);
  });

  it('sameRichText compares structure', () => {
    expect(sameRichText(plainToRichText('a'), plainToRichText('a'))).toBe(true);
    expect(sameRichText(plainToRichText('a'), null)).toBe(false);
    expect(sameRichText(null, null)).toBe(true);
  });
});
