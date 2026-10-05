-- Tables and indexes for categories and vocabulary cards (SPEC §17 "001").

create table if not exists public.categories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  slug              text not null check (slug <> '' and slug = lower(slug) and slug !~ '\s'),
  is_system         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id)                                   -- target of the composite FK
);

create unique index if not exists categories_user_name_uq   on public.categories (user_id, lower(name)) where deleted_at is null;
create unique index if not exists categories_user_slug_uq   on public.categories (user_id, slug)        where deleted_at is null;
create unique index if not exists categories_user_system_uq on public.categories (user_id)              where is_system;
create index        if not exists categories_user_sync_idx  on public.categories (user_id, server_updated_at);

create table if not exists public.vocabulary_cards (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title                         text not null check (char_length(btrim(title)) between 1 and 200),
  translation                   text check (char_length(translation) <= 500),
  example_sentence              text check (char_length(example_sentence) <= 1000),
  example_sentence_translation  text check (char_length(example_sentence_translation) <= 1000),
  category_id                   uuid not null,
  status                        text not null default 'learning' check (status in ('learning', 'learned')),
  audio_path                    text,
  learned_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  deleted_at                    timestamptz,
  server_updated_at             timestamptz not null default now(),
  constraint cards_category_fk foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete restrict,
  constraint cards_learned_at_ck check ((status = 'learned') = (learned_at is not null)),
  constraint cards_audio_path_ck check (
    audio_path is null or audio_path like (user_id::text || '/' || id::text || '/%')
  )
);

create index if not exists cards_user_sync_idx on public.vocabulary_cards (user_id, server_updated_at);
create index if not exists cards_category_idx  on public.vocabulary_cards (category_id);
