import { describe, expect, it } from 'vitest';
import { isPartOfSpeech, PARTS_OF_SPEECH, partOfSpeechLabel } from './partsOfSpeech';

describe('parts of speech', () => {
  it('labels every key', () => {
    expect(PARTS_OF_SPEECH.map(partOfSpeechLabel)).toEqual([
      'Noun',
      'Verb',
      'Adjective',
      'Adverb',
      'Phrasal verb',
      'Idiom',
      'Phrase',
      'Sentence',
    ]);
  });

  it('rejects empty, unknown and label values', () => {
    expect(isPartOfSpeech('noun')).toBe(true);
    expect(isPartOfSpeech('Noun')).toBe(false);
    expect(isPartOfSpeech('')).toBe(false);
    expect(isPartOfSpeech(null)).toBe(false);
    expect(partOfSpeechLabel(null)).toBeUndefined();
    expect(partOfSpeechLabel('conjunction')).toBeUndefined();
  });
});
