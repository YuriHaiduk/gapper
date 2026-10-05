-- Step 07a (D42): one rich-text `notes` field replaces translation / example_sentence /
-- example_sentence_translation. `notes` is a Tiptap/ProseMirror JSON document
-- ({"type":"doc","content":[…]}) or NULL. Existing values are merged into it, one paragraph
-- per line in the old field order, then the old columns are dropped (owner decision).
-- `updated_at` is not touched (LWW, §15.5); the z_touch trigger bumps `server_updated_at`,
-- so other devices pull the merged rows.

alter table public.vocabulary_cards add column if not exists notes jsonb;

alter table public.vocabulary_cards drop constraint if exists cards_notes_ck;
alter table public.vocabulary_cards add constraint cards_notes_ck check (
  notes is null
  or (jsonb_typeof(notes) = 'object' and notes ->> 'type' = 'doc' and octet_length(notes::text) <= 100000)
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vocabulary_cards' and column_name = 'translation'
  ) then
    update public.vocabulary_cards c
    set notes = jsonb_build_object('type', 'doc', 'content', merged.content)
    from (
      select v.id,
        jsonb_agg(
          case when l.line = '' then jsonb_build_object('type', 'paragraph')
          else jsonb_build_object('type', 'paragraph', 'content',
            jsonb_build_array(jsonb_build_object('type', 'text', 'text', l.line)))
          end
          order by f.ord, l.ord
        ) as content
      from public.vocabulary_cards v,
        unnest(array[v.translation, v.example_sentence, v.example_sentence_translation])
          with ordinality as f(val, ord),
        regexp_split_to_table(btrim(f.val), E'\r?\n') with ordinality as l(line, ord)
      where f.val is not null and btrim(f.val) <> ''
      group by v.id
    ) merged
    where c.id = merged.id and c.notes is null;

    alter table public.vocabulary_cards
      drop column translation,
      drop column example_sentence,
      drop column example_sentence_translation;
  end if;
end
$$;
