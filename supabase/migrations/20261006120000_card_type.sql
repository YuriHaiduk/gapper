-- Card part of speech (D63): optional `type`, a stable key from a fixed list; labels live in
-- the client (`src/domain/partsOfSpeech.ts`). Existing rows stay NULL; `updated_at` untouched.

alter table public.vocabulary_cards add column if not exists type text;

alter table public.vocabulary_cards drop constraint if exists cards_type_ck;
alter table public.vocabulary_cards add constraint cards_type_ck check (
  type is null or type in (
    'noun', 'verb', 'adjective', 'adverb', 'phrasal_verb', 'idiom', 'phrase',
    'sentence'
  )
);
