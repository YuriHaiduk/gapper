/** Part of speech of a card (SPEC §7.1, D63): a fixed list, stored as the key. */
export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrasal_verb',
  'idiom',
  'phrase',
  'sentence',
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

const LABELS: Record<PartOfSpeech, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  phrasal_verb: 'Phrasal verb',
  idiom: 'Idiom',
  phrase: 'Phrase',
  sentence: 'Sentence',
};

export function isPartOfSpeech(value: unknown): value is PartOfSpeech {
  return typeof value === 'string' && (PARTS_OF_SPEECH as readonly string[]).includes(value);
}

/** Display name, or undefined for an empty or unknown value. */
export function partOfSpeechLabel(value: string | null | undefined): string | undefined {
  return isPartOfSpeech(value) ? LABELS[value] : undefined;
}
