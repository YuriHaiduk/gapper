-- Card notes column (SPEC §17, D42). Rolled back: safe against the linked cloud project.
--   npx supabase@2.119.0 test db --linked

begin;
set local role postgres;
set local search_path = public, extensions;
select no_plan();

select has_column('public', 'vocabulary_cards', 'notes', 'cards have a notes column');
select col_type_is('public', 'vocabulary_cards', 'notes', 'jsonb', 'notes is jsonb');
select hasnt_column('public', 'vocabulary_cards', 'translation', 'translation was dropped');
select hasnt_column('public', 'vocabulary_cards', 'example_sentence', 'example_sentence was dropped');
select hasnt_column('public', 'vocabulary_cards', 'example_sentence_translation',
  'example_sentence_translation was dropped');

insert into auth.users (id, email, aud, role) values
  ('33333333-3333-4333-8333-333333333333', 'notes-test@example.invalid', 'authenticated', 'authenticated');

select lives_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, notes)
     select '33333333-3333-4333-8333-333333333333', 'x', id,
       '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hi"}]}]}'
     from public.categories where user_id = '33333333-3333-4333-8333-333333333333' and is_system $$,
  'a doc is accepted');
select lives_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, notes)
     select '33333333-3333-4333-8333-333333333333', 'x', id, null
     from public.categories where user_id = '33333333-3333-4333-8333-333333333333' and is_system $$,
  'null notes are accepted');
select throws_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, notes)
     select '33333333-3333-4333-8333-333333333333', 'x', id, '"plain text"'
     from public.categories where user_id = '33333333-3333-4333-8333-333333333333' and is_system $$,
  '23514', null, 'a non-doc value is rejected');
select throws_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, notes)
     select '33333333-3333-4333-8333-333333333333', 'x', id,
       jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object(
         'type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object(
           'type', 'text', 'text', repeat('a', 100001))))))
     from public.categories where user_id = '33333333-3333-4333-8333-333333333333' and is_system $$,
  '23514', null, 'an oversized doc is rejected');

select * from finish();
rollback;
